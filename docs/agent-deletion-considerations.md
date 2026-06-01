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
