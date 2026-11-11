# -*- coding: utf-8 -*-
import sys
from docx import Document

path = r"F:\DS-HarnessDisplay\《蛊真人》游戏策划\《蛊真人》总策划案\游戏的基础框架\小说设定——数值基础.docx"

doc = Document(path)
print("=== 段落 ===")
for i, p in enumerate(doc.paragraphs):
    t = p.text.strip()
    if t:
        print(f"[{i}] {t}")

print("\n=== 表格 ===")
for ti, table in enumerate(doc.tables):
    print(f"\n--- 表 {ti} ---")
    for row in table.rows:
        cells = [c.text.strip() for c in row.cells]
        print(" | ".join(cells))
