import pandas as pd

df = pd.read_csv('data\\saggingpushup1.csv', dtype=str)  # read everything as text
df = df.replace('0', '4')                                # text '0' -> '2'
df.to_csv('data\\saggingpushup2.csv', index=False)

# LABEL SYSTEM (what 'number' means in the file):
# - 1 = good pushup
# - 2 = elbows flared pushup
# - 3 = back too high pushup
# - 4 = sagging pushup
