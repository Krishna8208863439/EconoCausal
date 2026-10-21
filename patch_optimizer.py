import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'c:\Project\EconoCausal\ml\budget_optimizer.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """    if cleaned_df is not None and "avg_order_value" in cleaned_df.columns:
        merge_cols = ["customer_id", "avg_order_value"]
        if "discount_amount" in cleaned_df.columns:
            merge_cols.append("discount_amount")
        fin = cleaned_df[merge_cols].drop_duplicates("customer_id")
        df = ite_df.merge(fin, on="customer_id", how="left")"""

replacement = """    if cleaned_df is not None and "avg_order_value" in cleaned_df.columns:
        merge_cols = ["customer_id", "avg_order_value"]
        if "discount_amount" in cleaned_df.columns:
            merge_cols.append("discount_amount")
        fin = cleaned_df[merge_cols].copy()
        fin["customer_id"] = fin["customer_id"].astype(str)
        fin = fin.drop_duplicates("customer_id")
        ite_copy = ite_df.copy()
        ite_copy["customer_id"] = ite_copy["customer_id"].astype(str)
        df = ite_copy.merge(fin, on="customer_id", how="left")"""

assert target in content, "Target block not found in budget_optimizer.py"
content = content.replace(target, replacement, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched budget_optimizer.py to coerce customer_id to str before merge.")
