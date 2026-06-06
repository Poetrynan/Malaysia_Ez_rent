# 中介账号删除时的数据库行为与设计考量

在马来西亚 Ez Rent 房屋租赁系统中，当中介（管理端用户 `admin_users`）被删除时，其关联的房源（`units`）和合同（`leases`）将受到数据库完整性约束的影响。本文详细梳理当前的数据库默认行为、潜在风险以及推荐的解决方案。

---

## 1. 数据库默认行为与安全机制

当前线上数据库针对中介表的关联关系采用的是 Postgres 默认的 **限制删除（`RESTRICT / NO ACTION`）** 策略：

```
+---------------------+
| admin_users (中介)  |
+---------+-----------+
          ^
          | (外键约束: agent_id / assigned_to)
          |
+---------+-----------+        +-----------------+
|     units (房源)     |<-------|  leases (租约)  |
+---------------------+        +-----------------+
```

* **安全保护**：只要该中介名下仍绑定有任何房源或被指派了报修单，数据库将**直接拒绝删除**该中介，并向前端返回外键约束冲突错误。
* **数据保护**：这种默认设计确保了系统中的房源和合同数据**绝对不会因为中介账号的删除而意外丢失**，避免了数据孤儿（Orphaned Data）的产生。

---

## 2. 推荐的优化与解决方案

针对中介账号注销/删除的场景，有以下三种处理方案可供选择：

### 方案一：业务级手动转移（推荐：最安全、审计完整）
在删除中介账号前，超级管理员先在后台将其绑定的资产和待办项手动指派给其他中介：
* **步骤**：
  1. 将该中介负责的房源（`units`）负责人变更为另一位在职中介。
  2. 将未决的报修申请（`maintenance_requests`）重新分派给其他人。
  3. 执行删除中介账号的操作。
* **优点**：数据链路完整，房源和合同不会出现"无负责人"的空白状态。

### 方案二：数据库置空规则（`ON DELETE SET NULL`）
如果希望超级管理员能直接删除中介，并且在自动解除关联关系，可以修改外键约束：
* **行为**：当中介被删除后，关联房源的 `agent_id` 和关联报修单的 `assigned_to` 会被**自动清空（设为 `NULL`）**。
* **房源与合同**：**依然完好无损地保存在数据库中**，仅负责人状态变更为"未指派"。
* **修改 SQL 脚本**：
  ```sql
  -- 1. 更新房源表外键约束
  ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_agent_id_fkey;
  ALTER TABLE public.units 
  ADD CONSTRAINT units_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES public.admin_users(id) 
  ON DELETE SET NULL;

  -- 2. 更新报修单外键约束
  ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_assigned_to_fkey;
  ALTER TABLE public.maintenance_requests 
  ADD CONSTRAINT maintenance_requests_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) 
  ON DELETE SET NULL;
  ```

### 方案三：软删除与状态禁用（生产环境最佳实践）
对于已经产生过真实财务流水的系统，**物理删除中介账号是不妥当的**，因为这会导致历史报表、收款流水、合同经办人出现审计缺失。
* **行为**：不在数据库中物理删除该 `admin_users` 记录，而是采用**状态注销 / 冻结**。
* **实现**：
  在 `agent_profiles` 中将其状态更新为 `rejected` 或 `suspended`（挂起）。
* **优点**：保留了所有的历史账单、合同审计轨迹，同时在中介列表和房源指派下拉菜单中自动隐藏该中介。

---

> **开发团队建议**：首选 **方案一（转移后删除）**，这样可以零改动保障线上数据安全；若想减少管理员操作量，可运行上文的 SQL 脚本升级为 **方案二（自动置空）**；后续如系统规模扩大，推荐升级到 **方案三（软删除）** 以便进行完整的合规审计。

---

## 3. 已实施的双轨注销策略（2026-06-06）

系统区分**中介自助注销**与**超级管理员强制移除**两条路径：

| 路径 | 入口 | 活跃租约 | 登录 | 证件/REN 资料 | 租约/财务台账 |
|------|------|----------|------|---------------|---------------|
| 中介自助注销 | 顶栏「注销账号」 | 有则**拒绝** | Day 0 立即吊销 | 保留 **7 天**后自动删除 | **始终保留** |
| 超管移除 | 管理后台删除按钮 | 有则**拒绝** | 立即吊销 | **立即删除** | **始终保留** |
| 租客自助注销 | 顶栏「注销账号」 | — | Day 0 立即吊销 | 证件保留 **7 天** | 解耦后保留 |

### 3.1 中介自助注销（软删除 + 7 天取证留存）

* **Day 0**（`deleteAccountAction`）：
  1. 检查该中介名下 `units` 是否有 `status = 'active'` 的租约 → 有则返回错误，拒绝注销。
  2. 删除 `user_notifications`。
  3. 在 `users.avatar_url`、`admin_users.avatar_url` 写入 `DELETED:{ISO时间戳}`。
  4. 在 `agent_profiles` 将 `verification_status` 设为 `rejected`，`rejection_reason` 写入同一时间戳标记。
  5. 通过 Service Role 删除 `auth.users`（立即无法登录）。
* **Day 7+**（`cleanupExpiredDeletedAccountsAction`）：
  1. 扫描 `admin_users.avatar_url LIKE 'DELETED:%'` 且超过 7 天的记录。
  2. 删除 REN 图片（Storage）、`agent_profiles`、`admin_users`、`users`。
* **触发方式**：每次自助注销时顺带清理 + Vercel Cron 每天 03:00（`/api/cron/cleanup-expired-deleted-accounts`，需 `CRON_SECRET` 鉴权）。

### 3.2 超级管理员强制移除（立即物理删除）

* **入口**：`deleteAgentBySuperAdminAction`（`AdminPanel` 管理员列表删除按钮）。
* **行为**：立即删除 `user_notifications`、`agent_profiles`、`admin_users`、`users`、REN Storage 文件、`auth.users`。
* **不走 7 天留存**——适用于超管主动清理违规/离职中介。
* **同样拦截**：名下有活跃租约时拒绝删除。

### 3.3 Service Role 绕过 RLS

* `admin_users` 表受 RLS 保护，普通客户端无法 `DELETE`。
* 所有注销/移除操作均通过 `SUPABASE_SERVICE_ROLE_KEY` 提权的 `adminClient` 执行，避免 auth 已删、admin_users 残留的僵尸数据。

### 3.4 UI 与列表过滤

* `AppTopbar`：中介与租客显示不同的注销说明文案。
* `AdminPanel`：`fetchAdmins()` 过滤 `avatar_url` 以 `DELETED:` 开头的记录。

### 3.5 离线审核通过时的系统通知投递冷启动关联

* **背景问题**：
  若中介在申请时未登录（即为免密申请的外部邮箱），其注册申请记录 `agent_profiles` 中的 `auth_user_id` 为 `NULL`。当超级管理员点击"同意"通过其申请时，由于缺少外键引用的 Auth 用户，数据库约束了无法向其直接插入 `user_notifications`。若后期该中介注册账号登录，其收件箱将是一片空白，缺少通过状态的仪式感。
* **同步机制**：
  通过升级 `on_auth_user_created` 对应的 `handle_new_auth_user()` 触发器函数，将通过逻辑后置。管理员通过离线申请后只会在中介表生成记录；当该邮箱用户后续注册登录时，数据库会自动检测关联，并在绑定身份的瞬间自动向其追加"中介申请已通过"的初始通知消息：
  ```sql
  -- 如果新注册用户的邮箱在 admin_users 中已被超级管理员预审核通过
  IF NEW.email IS NOT NULL THEN
    UPDATE public.admin_users SET id = NEW.id WHERE email = NEW.email;
    IF FOUND THEN
      -- 自动补发初始通过通知
      IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id = NEW.id AND type = 'agent_status') THEN
        INSERT INTO public.user_notifications (user_id, title, content, type, is_read)
        VALUES (
          NEW.id,
          '中介申请已通过 / Agent Application Approved',
          '您的中介申请已通过审核，现在您可以发布房源和管理租约了！',
          'agent_status',
          FALSE
        );
      END IF;
    END IF;
  END IF;
  ```
  该逻辑的完整 SQL 执行补丁存放在 `supabase/update_trigger.sql` 中。
