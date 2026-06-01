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
* **优点**：数据链路完整，房源和合同不会出现“无负责人”的空白状态。

### 方案二：数据库置空规则（`ON DELETE SET NULL`）
如果希望超级管理员能直接删除中介，并且在自动解除关联关系，可以修改外键约束：
* **行为**：当中介被删除后，关联房源的 `agent_id` 和关联报修单的 `assigned_to` 会被**自动清空（设为 `NULL`）**。
* **房源与合同**：**依然完好无损地保存在数据库中**，仅负责人状态变更为“未指派”。
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
  在中介注册记录（`agent_registrations`）中将其状态更新为 `suspended`（挂起）或 `banned`（禁用）。
* **优点**：保留了所有的历史账单、合同审计轨迹，同时在中介列表和房源指派下拉菜单中自动隐藏该中介。

---

> **开发团队建议**：首选 **方案一（转移后删除）**，这样可以零改动保障线上数据安全；若想减少管理员操作量，可运行上文的 SQL 脚本升级为 **方案二（自动置空）**；后续如系统规模扩大，推荐升级到 **方案三（软删除）** 以便进行完整的合规审计。

---

## 3. 账号注销及离线审核生命周期同步设计

在处理用户注销账号（物理删除）及先申请后注册的异步场景中，系统在数据库级与服务端层面进行了以下核心同步设计：

### 3.1 绕过 Row Level Security (RLS) 的物理级注销安全移除
* **背景问题**：
  在租客或二级管理员（`editor` / `agent`）调用“注销账号”时，系统需要将其彻底从数据库中抹除。但由于 `admin_users` 表由 RLS 策略保护（限制了非 `super_admin` 角色的 `DELETE` 操作），使用常规的浏览器/用户权限 Supabase 客户端去执行 `DELETE` 会被数据库行级安全拦截，造成用户在 `auth.users` 和 `public.users` 中已被删除，但在中介管理员表 `admin_users` 中却残留的“僵尸数据”现象。
* **同步机制**：
  在服务端的账号删除接口 `deleteAccountAction` 中，改用提权过的 Service Role 客户端进行数据清除。这能够强制绕过 RLS 策略保护，确保用户在执行账号注销时，其在中介表 `admin_users` 里的数据亦可跟随 `users` 表一并彻底、安全地删除。

### 3.2 离线审核通过时的“系统通知投递”冷启动关联
* **背景问题**：
  若中介在申请时未登录（即为免密申请的外部邮箱），其注册申请记录 `agent_registrations` 中的 `auth_user_id` 为 `NULL`。当超级管理员点击“同意”通过其申请时，由于缺少外键引用的 Auth 用户，数据库约束了无法向其直接插入 `user_notifications`。若后期该中介注册账号登录，其收件箱将是一片空白，缺少通过状态的仪式感。
* **同步机制**：
  通过升级 `on_auth_user_created` 对应的 `handle_new_auth_user()` 触发器函数，将通过逻辑后置。管理员通过离线申请后只会在中介表生成记录；当该邮箱用户后续注册登录时，数据库会自动检测关联，并在绑定身份的瞬间自动向其追加“中介申请已通过”的初始通知消息：
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
  该逻辑的完整 SQL 执行补丁存放在 [supabase/update_trigger.sql](file:///c:/Users/Administrator/Desktop/Malaysia_Ez_rent/supabase/update_trigger.sql) 中。

