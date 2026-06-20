-- V10 迁移：question_types 增加三个流程字段
-- discovery_flow：负责设计孩子脑子里的路（思维引导）
-- interaction_flow：负责设计孩子手上的路（交互操作）
-- animation_flow：负责设计孩子眼睛看到的路（视觉呈现）

ALTER TABLE question_types ADD COLUMN IF NOT EXISTS discovery_flow TEXT DEFAULT '';
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS interaction_flow TEXT DEFAULT '';
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS animation_flow TEXT DEFAULT '';
