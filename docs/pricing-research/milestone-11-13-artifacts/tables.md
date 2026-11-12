# Frozen evidence benchmark tables

Synthetic, externally truth-audited eligibility; not a merchant population estimate. Production uncertainty unavailable in every case. Coverage intervals below are Wilson95% binomial intervals across independent seeds within a family; no causal calibration is established. Each n is historical days, not independent prices. Coherent=false targets are excluded from global-beta error and coverage. Structural local beta remains visible in cases.csv, not treated as a global truth.

## Decision matrices

Approved/abstained cells; indeterminate cases excluded from precision and recall, included in overall abstention.

|Split|Family|Days|Safe A/W|Unsafe A/W|Indeterminate A/W|Precision|Recall|Unsafe approval|False abstention|Overall abstention|
|---|---|---:|---|---|---|---|---|---|---|---|
|DEV|DISCRETE5|5|0/0|0/0|0/4|unavailable|unavailable|unavailable|unavailable|4/4|
|DEV|DISCRETE20|20|0/0|0/0|0/4|unavailable|unavailable|unavailable|unavailable|4/4|
|DEV|DISCRETE50|50|0/0|0/0|0/4|unavailable|unavailable|unavailable|unavailable|4/4|
|DEV|DISCRETE130|130|0/4|0/0|0/0|unavailable|0/4|unavailable|4/4|4/4|
|DEV|DISCRETE180|180|0/4|0/0|0/0|unavailable|0/4|unavailable|4/4|4/4|
|DEV|DISCRETE365|365|4/0|0/0|0/0|4/4|4/4|unavailable|0/4|0/4|
|DEV|DISCRETE700|700|4/0|0/0|0/0|4/4|4/4|unavailable|0/4|0/4|
|DEV|CONTINUOUS365|365|0/4|0/0|0/0|unavailable|0/4|unavailable|4/4|4/4|
|DEV|CONTINUOUS700|700|0/4|0/0|0/0|unavailable|0/4|unavailable|4/4|4/4|
|DEV|PLATEAU|365|0/0|0/0|4/0|unavailable|unavailable|unavailable|unavailable|0/4|
|DEV|NARROW|365|0/4|0/0|0/0|unavailable|0/4|unavailable|4/4|4/4|
|DEV|CALENDAR|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|PROMOTION|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|HIDDEN_MARKETING|365|0/0|4/0|0/0|0/4|unavailable|4/4|unavailable|0/4|
|DEV|COMPETITOR|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|HOLIDAY|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|SHIFT|365|0/0|4/0|0/0|0/4|unavailable|4/4|unavailable|0/4|
|DEV|STRUCTURAL|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|REGIMES|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|STOCKOUT|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|GAPS|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|MISSING_COST|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|WRONG_COST|365|0/0|4/0|0/0|0/4|unavailable|4/4|unavailable|0/4|
|DEV|REFUNDS|365|0/0|0/0|4/0|unavailable|unavailable|unavailable|unavailable|0/4|
|DEV|WEAK|365|4/0|0/0|0/0|4/4|4/4|unavailable|0/4|0/4|
|DEV|STRONG|365|3/1|0/0|0/0|3/3|3/4|unavailable|1/4|1/4|
|DEV|ZERO_RESPONSE|365|2/2|0/0|0/0|2/2|2/4|unavailable|2/4|2/4|
|DEV|SPARSE|365|0/0|0/0|0/4|unavailable|unavailable|unavailable|unavailable|4/4|
|DEV|NOISY|365|0/0|0/0|0/4|unavailable|unavailable|unavailable|unavailable|4/4|
|DEV|FLAT|365|0/0|0/0|4/0|unavailable|unavailable|unavailable|unavailable|0/4|
|DEV|CONSTANT|365|0/0|0/4|0/0|unavailable|unavailable|0/4|unavailable|4/4|
|DEV|EXPONENTIAL|365|0/0|0/0|4/0|unavailable|unavailable|unavailable|unavailable|0/4|
|DEV|COST20|365|4/0|0/0|0/0|4/4|4/4|unavailable|0/4|0/4|
|DEV|COST60|365|4/0|0/0|0/0|4/4|4/4|unavailable|0/4|0/4|
|DEV|BOUNDARY|365|4/0|0/0|0/0|4/4|4/4|unavailable|0/4|0/4|
|TEST|DISCRETE5|5|0/0|0/0|0/20|unavailable|unavailable|unavailable|unavailable|20/20|
|TEST|DISCRETE20|20|0/0|0/0|0/20|unavailable|unavailable|unavailable|unavailable|20/20|
|TEST|DISCRETE50|50|0/0|0/0|0/20|unavailable|unavailable|unavailable|unavailable|20/20|
|TEST|DISCRETE130|130|0/20|0/0|0/0|unavailable|0/20|unavailable|20/20|20/20|
|TEST|DISCRETE180|180|0/20|0/0|0/0|unavailable|0/20|unavailable|20/20|20/20|
|TEST|DISCRETE365|365|20/0|0/0|0/0|20/20|20/20|unavailable|0/20|0/20|
|TEST|DISCRETE700|700|20/0|0/0|0/0|20/20|20/20|unavailable|0/20|0/20|
|TEST|CONTINUOUS365|365|0/20|0/0|0/0|unavailable|0/20|unavailable|20/20|20/20|
|TEST|CONTINUOUS700|700|0/20|0/0|0/0|unavailable|0/20|unavailable|20/20|20/20|
|TEST|PLATEAU|365|0/0|0/0|20/0|unavailable|unavailable|unavailable|unavailable|0/20|
|TEST|NARROW|365|0/20|0/0|0/0|unavailable|0/20|unavailable|20/20|20/20|
|TEST|CALENDAR|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|PROMOTION|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|HIDDEN_MARKETING|365|0/0|20/0|0/0|0/20|unavailable|20/20|unavailable|0/20|
|TEST|COMPETITOR|365|0/0|4/16|0/0|0/4|unavailable|4/20|unavailable|16/20|
|TEST|HOLIDAY|365|0/0|1/19|0/0|0/1|unavailable|1/20|unavailable|19/20|
|TEST|SHIFT|365|0/0|20/0|0/0|0/20|unavailable|20/20|unavailable|0/20|
|TEST|STRUCTURAL|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|REGIMES|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|STOCKOUT|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|GAPS|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|MISSING_COST|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|WRONG_COST|365|0/0|20/0|0/0|0/20|unavailable|20/20|unavailable|0/20|
|TEST|REFUNDS|365|0/0|0/0|20/0|unavailable|unavailable|unavailable|unavailable|0/20|
|TEST|WEAK|365|20/0|0/0|0/0|20/20|20/20|unavailable|0/20|0/20|
|TEST|STRONG|365|15/5|0/0|0/0|15/15|15/20|unavailable|5/20|5/20|
|TEST|ZERO_RESPONSE|365|11/9|0/0|0/0|11/11|11/20|unavailable|9/20|9/20|
|TEST|SPARSE|365|0/0|0/0|0/20|unavailable|unavailable|unavailable|unavailable|20/20|
|TEST|NOISY|365|0/0|0/0|0/20|unavailable|unavailable|unavailable|unavailable|20/20|
|TEST|FLAT|365|0/0|0/0|20/0|unavailable|unavailable|unavailable|unavailable|0/20|
|TEST|CONSTANT|365|0/0|0/20|0/0|unavailable|unavailable|0/20|unavailable|20/20|
|TEST|EXPONENTIAL|365|0/0|0/0|20/0|unavailable|unavailable|unavailable|unavailable|0/20|
|TEST|COST20|365|20/0|0/0|0/0|20/20|20/20|unavailable|0/20|0/20|
|TEST|COST60|365|20/0|0/0|0/0|20/20|20/20|unavailable|0/20|0/20|
|TEST|BOUNDARY|365|20/0|0/0|0/0|20/20|20/20|unavailable|0/20|0/20|
|CHALLENGE|DISCRETE5|5|0/0|0/0|0/12|unavailable|unavailable|unavailable|unavailable|12/12|
|CHALLENGE|DISCRETE20|20|0/0|0/0|0/12|unavailable|unavailable|unavailable|unavailable|12/12|
|CHALLENGE|DISCRETE50|50|0/0|0/0|0/12|unavailable|unavailable|unavailable|unavailable|12/12|
|CHALLENGE|DISCRETE130|130|0/12|0/0|0/0|unavailable|0/12|unavailable|12/12|12/12|
|CHALLENGE|DISCRETE180|180|0/12|0/0|0/0|unavailable|0/12|unavailable|12/12|12/12|
|CHALLENGE|DISCRETE365|365|12/0|0/0|0/0|12/12|12/12|unavailable|0/12|0/12|
|CHALLENGE|DISCRETE700|700|12/0|0/0|0/0|12/12|12/12|unavailable|0/12|0/12|
|CHALLENGE|CONTINUOUS365|365|0/12|0/0|0/0|unavailable|0/12|unavailable|12/12|12/12|
|CHALLENGE|CONTINUOUS700|700|0/12|0/0|0/0|unavailable|0/12|unavailable|12/12|12/12|
|CHALLENGE|PLATEAU|365|0/0|0/0|12/0|unavailable|unavailable|unavailable|unavailable|0/12|
|CHALLENGE|NARROW|365|0/12|0/0|0/0|unavailable|0/12|unavailable|12/12|12/12|
|CHALLENGE|CALENDAR|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|PROMOTION|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|HIDDEN_MARKETING|365|0/0|12/0|0/0|0/12|unavailable|12/12|unavailable|0/12|
|CHALLENGE|COMPETITOR|365|0/0|4/8|0/0|0/4|unavailable|4/12|unavailable|8/12|
|CHALLENGE|HOLIDAY|365|0/0|1/11|0/0|0/1|unavailable|1/12|unavailable|11/12|
|CHALLENGE|SHIFT|365|0/0|12/0|0/0|0/12|unavailable|12/12|unavailable|0/12|
|CHALLENGE|STRUCTURAL|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|REGIMES|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|STOCKOUT|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|GAPS|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|MISSING_COST|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|WRONG_COST|365|0/0|12/0|0/0|0/12|unavailable|12/12|unavailable|0/12|
|CHALLENGE|REFUNDS|365|0/0|0/0|12/0|unavailable|unavailable|unavailable|unavailable|0/12|
|CHALLENGE|WEAK|365|12/0|0/0|0/0|12/12|12/12|unavailable|0/12|0/12|
|CHALLENGE|STRONG|365|10/2|0/0|0/0|10/10|10/12|unavailable|2/12|2/12|
|CHALLENGE|ZERO_RESPONSE|365|7/5|0/0|0/0|7/7|7/12|unavailable|5/12|5/12|
|CHALLENGE|SPARSE|365|0/0|0/0|0/12|unavailable|unavailable|unavailable|unavailable|12/12|
|CHALLENGE|NOISY|365|0/0|0/0|0/12|unavailable|unavailable|unavailable|unavailable|12/12|
|CHALLENGE|FLAT|365|0/0|0/0|12/0|unavailable|unavailable|unavailable|unavailable|0/12|
|CHALLENGE|CONSTANT|365|0/0|0/12|0/0|unavailable|unavailable|0/12|unavailable|12/12|
|CHALLENGE|EXPONENTIAL|365|0/0|0/0|12/0|unavailable|unavailable|unavailable|unavailable|0/12|
|CHALLENGE|COST20|365|12/0|0/0|0/0|12/12|12/12|unavailable|0/12|0/12|
|CHALLENGE|COST60|365|12/0|0/0|0/0|12/12|12/12|unavailable|0/12|0/12|
|CHALLENGE|BOUNDARY|365|12/0|0/0|0/0|12/12|12/12|unavailable|0/12|0/12|

## Elasticity error and approved-price economic regret

Errors are available-case production point estimates on coherent constant-beta targets, including confounding failures. Economic target is a standardized future30-day reference context with1000 expected units/day at100 (sparse .7), correct evaluator cost and no future shocks; historical weekday/shock patterns are not repeated as an oracle forecasting model. Thus these are synthetic response-decision losses, not forecast validation. No approved-price regret is imputed for abstention; hold opportunity is reported separately.

|Split|Family|Error N|Bias|MAE|RMSE|Approved N|Mean absolute regret MAD|Mean normalized regret|Max regret MAD|Mean hold opportunity MAD|Bounds violations|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|DEV|DISCRETE5|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|DISCRETE20|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|DISCRETE50|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|DISCRETE130|4|0.0229|0.0229|0.02461|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|DISCRETE180|4|0.00676|0.02156|0.02511|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|DISCRETE365|4|-0.0074|0.01536|0.01585|4|0|0|0|51851.85185|0|
|DEV|DISCRETE700|4|-0.00779|0.01065|0.01263|4|0|0|0|51851.85185|0|
|DEV|CONTINUOUS365|4|-0.02752|0.02752|0.03082|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|CONTINUOUS700|4|-0.0131|0.0131|0.01577|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|PLATEAU|4|-0.0044|0.0078|0.01182|4|0|0|0|51851.85185|0|
|DEV|NARROW|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|28254.84765|0|
|DEV|CALENDAR|4|0.02694|0.02694|0.03081|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|PROMOTION|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|HIDDEN_MARKETING|4|-1.7574|1.7574|1.75746|4|510518.4442|0.24897|510518.4442|250553.58832|0|
|DEV|COMPETITOR|4|-0.8428|0.8428|0.84282|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|HOLIDAY|4|0.04389|0.08547|0.09636|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|SHIFT|4|0.01057|0.03442|0.03892|4|0|0|0|51851.85185|0|
|DEV|STRUCTURAL|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|REGIMES|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|STOCKOUT|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|GAPS|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|MISSING_COST|4|0.00303|0.01097|0.013|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|WRONG_COST|4|-0.00646|0.01423|0.01542|4|128558.31038|0.1037|128558.31038|39669.42149|0|
|DEV|REFUNDS|4|-0.01033|0.01033|0.01326|4|0|0|0|51851.85185|0|
|DEV|WEAK|4|-0.00943|0.01477|0.01688|4|0|0|0|250553.58832|0|
|DEV|STRONG|4|0.00601|0.00722|0.01007|3|0|0|0|257613.16872|0|
|DEV|ZERO_RESPONSE|2|-0.00821|0.00821|0.00888|2|0|0|0|300000|0|
|DEV|SPARSE|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|36.2963|0|
|DEV|NOISY|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|DEV|FLAT|4|0.00804|0.00804|0.00848|4|59.03906|0.00003|126.32924|0|0|
|DEV|CONSTANT|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|0|0|
|DEV|EXPONENTIAL|0|unavailable|unavailable|unavailable|4|0|0|0|32104.13724|0|
|DEV|COST20|4|0.00296|0.01374|0.01574|4|0|0|0|192592.59259|0|
|DEV|COST60|4|-0.0031|0.01093|0.01315|4|0|0|0|39669.42149|0|
|DEV|BOUNDARY|4|-0.00122|0.01902|0.02369|4|42.46769|0.00003|109.80893|20525.52645|0|
|TEST|DISCRETE5|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|46666.66667|0|
|TEST|DISCRETE20|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|DISCRETE50|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|DISCRETE130|20|-0.00755|0.0206|0.02451|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|DISCRETE180|20|0.00796|0.02|0.02418|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|DISCRETE365|20|-0.00199|0.01473|0.01774|20|0|0|0|51851.85185|0|
|TEST|DISCRETE700|20|-0.00304|0.00919|0.01065|20|0|0|0|51851.85185|0|
|TEST|CONTINUOUS365|20|-0.00671|0.01833|0.02282|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|CONTINUOUS700|20|-0.00252|0.01082|0.01452|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|PLATEAU|20|-0.00166|0.00921|0.01223|20|0|0|0|51851.85185|0|
|TEST|NARROW|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|28254.84765|0|
|TEST|CALENDAR|20|0.0128|0.03752|0.04152|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|PROMOTION|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|HIDDEN_MARKETING|20|-1.75199|1.75199|1.75208|20|510518.4442|0.24897|510518.4442|250553.58832|0|
|TEST|COMPETITOR|20|-0.85992|0.85992|0.86023|4|0|0|0|51851.85185|0|
|TEST|HOLIDAY|20|0.04489|0.06776|0.07881|1|0|0|0|51851.85185|0|
|TEST|SHIFT|20|-0.00642|0.02434|0.03167|20|0|0|0|51851.85185|0|
|TEST|STRUCTURAL|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|REGIMES|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|STOCKOUT|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|GAPS|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|MISSING_COST|20|-0.00255|0.01215|0.01455|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|WRONG_COST|20|-0.0001|0.00918|0.0106|20|128558.31038|0.1037|128558.31038|39669.42149|0|
|TEST|REFUNDS|20|0.00399|0.01483|0.01797|20|0|0|0|51851.85185|0|
|TEST|WEAK|20|0.00103|0.0141|0.01629|20|0|0|0|250553.58832|0|
|TEST|STRONG|20|-0.00502|0.00996|0.01306|15|0|0|0|257613.16872|0|
|TEST|ZERO_RESPONSE|11|-0.0119|0.0119|0.01527|11|0|0|0|300000|0|
|TEST|SPARSE|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|36.2963|0|
|TEST|NOISY|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|TEST|FLAT|20|0.00157|0.01423|0.01662|20|224.77511|0.00012|589.51766|0|0|
|TEST|CONSTANT|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|0|0|
|TEST|EXPONENTIAL|0|unavailable|unavailable|unavailable|20|0|0|0|32104.13724|0|
|TEST|COST20|20|0.00041|0.01303|0.01699|20|0|0|0|192592.59259|0|
|TEST|COST60|20|0.00281|0.01416|0.0181|20|0|0|0|39669.42149|0|
|TEST|BOUNDARY|20|-0.00347|0.01356|0.01647|20|28.73193|0.00002|254.81484|20525.52645|0|
|CHALLENGE|DISCRETE5|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|43209.87654|0|
|CHALLENGE|DISCRETE20|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|DISCRETE50|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|DISCRETE130|12|-0.00936|0.02391|0.03065|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|DISCRETE180|12|-0.01546|0.01965|0.02394|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|DISCRETE365|12|0.00407|0.00813|0.01074|12|0|0|0|51851.85185|0|
|CHALLENGE|DISCRETE700|12|-0.00097|0.00736|0.00832|12|0|0|0|51851.85185|0|
|CHALLENGE|CONTINUOUS365|12|-0.00365|0.01326|0.01887|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|CONTINUOUS700|12|-0.00171|0.00706|0.01114|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|PLATEAU|12|0.00372|0.01605|0.0188|12|0|0|0|51851.85185|0|
|CHALLENGE|NARROW|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|28254.84765|0|
|CHALLENGE|CALENDAR|12|-0.00168|0.03183|0.03967|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|PROMOTION|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|HIDDEN_MARKETING|12|-1.74593|1.74593|1.74596|12|510518.4442|0.24897|510518.4442|250553.58832|0|
|CHALLENGE|COMPETITOR|12|-0.84928|0.84928|0.84964|4|0|0|0|51851.85185|0|
|CHALLENGE|HOLIDAY|12|0.01454|0.06146|0.07665|1|0|0|0|51851.85185|0|
|CHALLENGE|SHIFT|12|-0.01854|0.02688|0.03508|12|0|0|0|51851.85185|0|
|CHALLENGE|STRUCTURAL|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|REGIMES|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|STOCKOUT|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|GAPS|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|MISSING_COST|12|0.00041|0.01246|0.01526|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|WRONG_COST|12|-0.00323|0.00875|0.01126|12|128558.31038|0.1037|128558.31038|39669.42149|0|
|CHALLENGE|REFUNDS|12|-0.0062|0.01533|0.0165|12|0|0|0|51851.85185|0|
|CHALLENGE|WEAK|12|0.00789|0.01278|0.01478|12|0|0|0|250553.58832|0|
|CHALLENGE|STRONG|12|0.00896|0.01495|0.01769|10|0|0|0|257613.16872|0|
|CHALLENGE|ZERO_RESPONSE|7|-0.01558|0.01558|0.01757|7|0|0|0|300000|0|
|CHALLENGE|SPARSE|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|36.2963|0|
|CHALLENGE|NOISY|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|51851.85185|0|
|CHALLENGE|FLAT|12|0.0019|0.01187|0.01512|12|185.83923|0.0001|658.22611|0|0|
|CHALLENGE|CONSTANT|0|unavailable|unavailable|unavailable|0|unavailable|unavailable|unavailable|0|0|
|CHALLENGE|EXPONENTIAL|0|unavailable|unavailable|unavailable|12|0|0|0|32104.13724|0|
|CHALLENGE|COST20|12|-0.00008|0.01023|0.01307|12|0|0|0|192592.59259|0|
|CHALLENGE|COST60|12|0.00202|0.01326|0.01587|12|0|0|0|39669.42149|0|
|CHALLENGE|BOUNDARY|12|-0.00444|0.01436|0.01675|12|27.7004|0.00002|222.36399|20525.52645|0|

## Nominal95% conditional interval coverage

Bootstrap99 replicates; percentile intervals require80 valid fits. A missing method row means unavailable, not zero coverage. Intervals do not account for hidden confounding or incorrect costs. Widths are elasticity units. Pairs and moving14-day blocks resample selected positive uncensored observations, not the full missingness/selection process.

|Split|Family|Method|Covered/available|Wilson95% low/high|Mean width|
|---|---|---|---|---|---:|
|DEV|DISCRETE130|wald|4/4|0.5101 / 1|0.11569|
|DEV|DISCRETE130|pairs|4/4|0.5101 / 1|0.11102|
|DEV|DISCRETE130|block|4/4|0.5101 / 1|0.11443|
|DEV|DISCRETE180|wald|4/4|0.5101 / 1|0.09595|
|DEV|DISCRETE180|pairs|4/4|0.5101 / 1|0.10372|
|DEV|DISCRETE180|block|3/4|0.30064 / 0.95441|0.08967|
|DEV|DISCRETE365|wald|4/4|0.5101 / 1|0.06291|
|DEV|DISCRETE365|pairs|4/4|0.5101 / 1|0.06226|
|DEV|DISCRETE365|block|4/4|0.5101 / 1|0.06402|
|DEV|DISCRETE700|wald|4/4|0.5101 / 1|0.04082|
|DEV|DISCRETE700|pairs|3/4|0.30064 / 0.95441|0.03889|
|DEV|DISCRETE700|block|4/4|0.5101 / 1|0.03679|
|DEV|CONTINUOUS365|wald|3/4|0.30064 / 0.95441|0.09054|
|DEV|CONTINUOUS365|pairs|4/4|0.5101 / 1|0.09073|
|DEV|CONTINUOUS365|block|3/4|0.30064 / 0.95441|0.08993|
|DEV|CONTINUOUS700|wald|4/4|0.5101 / 1|0.05927|
|DEV|PLATEAU|wald|4/4|0.5101 / 1|0.05929|
|DEV|NARROW|wald|2/4|0.15004 / 0.84996|0.24745|
|DEV|CALENDAR|wald|4/4|0.5101 / 1|0.16455|
|DEV|PROMOTION|wald|4/4|0.5101 / 1|0.05889|
|DEV|HIDDEN_MARKETING|wald|0/4|0 / 0.4899|0.06291|
|DEV|HIDDEN_MARKETING|pairs|0/4|0 / 0.4899|0.06226|
|DEV|HIDDEN_MARKETING|block|0/4|0 / 0.4899|0.06402|
|DEV|COMPETITOR|wald|0/4|0 / 0.4899|0.10698|
|DEV|HOLIDAY|wald|4/4|0.5101 / 1|0.28503|
|DEV|SHIFT|wald|3/4|0.30064 / 0.95441|0.11638|
|DEV|STOCKOUT|wald|3/4|0.30064 / 0.95441|0.07427|
|DEV|GAPS|wald|4/4|0.5101 / 1|0.07582|
|DEV|MISSING_COST|wald|4/4|0.5101 / 1|0.05991|
|DEV|WRONG_COST|wald|4/4|0.5101 / 1|0.05942|
|DEV|REFUNDS|wald|4/4|0.5101 / 1|0.0607|
|DEV|WEAK|wald|4/4|0.5101 / 1|0.05771|
|DEV|STRONG|wald|4/4|0.5101 / 1|0.05914|
|DEV|ZERO_RESPONSE|wald|4/4|0.5101 / 1|0.05901|
|DEV|ZERO_RESPONSE|pairs|4/4|0.5101 / 1|0.06384|
|DEV|ZERO_RESPONSE|block|4/4|0.5101 / 1|0.06389|
|DEV|SPARSE|wald|0/4|0 / 0.4899|0.81234|
|DEV|NOISY|wald|4/4|0.5101 / 1|1.31457|
|DEV|NOISY|pairs|4/4|0.5101 / 1|1.21983|
|DEV|NOISY|block|4/4|0.5101 / 1|1.28765|
|DEV|FLAT|wald|4/4|0.5101 / 1|0.06076|
|DEV|COST20|wald|4/4|0.5101 / 1|0.05941|
|DEV|COST60|wald|4/4|0.5101 / 1|0.061|
|DEV|BOUNDARY|wald|3/4|0.30064 / 0.95441|0.06078|
|TEST|DISCRETE130|wald|20/20|0.83887 / 1|0.12935|
|TEST|DISCRETE130|pairs|20/20|0.83887 / 1|0.12606|
|TEST|DISCRETE130|block|18/20|0.69896 / 0.97213|0.13026|
|TEST|DISCRETE180|wald|19/20|0.76386 / 0.99112|0.09455|
|TEST|DISCRETE180|pairs|18/20|0.69896 / 0.97213|0.09414|
|TEST|DISCRETE180|block|18/20|0.69896 / 0.97213|0.08978|
|TEST|DISCRETE365|wald|19/20|0.76386 / 0.99112|0.06078|
|TEST|DISCRETE365|pairs|19/20|0.76386 / 0.99112|0.06007|
|TEST|DISCRETE365|block|17/20|0.63958 / 0.94763|0.05435|
|TEST|DISCRETE700|wald|20/20|0.83887 / 1|0.04196|
|TEST|DISCRETE700|pairs|19/20|0.76386 / 0.99112|0.03993|
|TEST|DISCRETE700|block|19/20|0.76386 / 0.99112|0.04031|
|TEST|CONTINUOUS365|wald|18/20|0.69896 / 0.97213|0.08463|
|TEST|CONTINUOUS365|pairs|18/20|0.69896 / 0.97213|0.08466|
|TEST|CONTINUOUS365|block|18/20|0.69896 / 0.97213|0.08026|
|TEST|CONTINUOUS700|wald|19/20|0.76386 / 0.99112|0.05871|
|TEST|PLATEAU|wald|20/20|0.83887 / 1|0.05974|
|TEST|NARROW|wald|20/20|0.83887 / 1|0.24657|
|TEST|CALENDAR|wald|19/20|0.76386 / 0.99112|0.16939|
|TEST|PROMOTION|wald|20/20|0.83887 / 1|0.05964|
|TEST|HIDDEN_MARKETING|wald|0/20|0 / 0.16113|0.06078|
|TEST|HIDDEN_MARKETING|pairs|0/20|0 / 0.16113|0.06007|
|TEST|HIDDEN_MARKETING|block|0/20|0 / 0.16113|0.05435|
|TEST|COMPETITOR|wald|0/20|0 / 0.16113|0.11053|
|TEST|HOLIDAY|wald|19/20|0.76386 / 0.99112|0.28202|
|TEST|SHIFT|wald|19/20|0.76386 / 0.99112|0.11689|
|TEST|STOCKOUT|wald|19/20|0.76386 / 0.99112|0.07489|
|TEST|GAPS|wald|19/20|0.76386 / 0.99112|0.07607|
|TEST|MISSING_COST|wald|19/20|0.76386 / 0.99112|0.06132|
|TEST|WRONG_COST|wald|20/20|0.83887 / 1|0.06044|
|TEST|REFUNDS|wald|19/20|0.76386 / 0.99112|0.06002|
|TEST|WEAK|wald|19/20|0.76386 / 0.99112|0.05974|
|TEST|STRONG|wald|20/20|0.83887 / 1|0.06206|
|TEST|ZERO_RESPONSE|wald|19/20|0.76386 / 0.99112|0.06064|
|TEST|ZERO_RESPONSE|pairs|19/20|0.76386 / 0.99112|0.06183|
|TEST|ZERO_RESPONSE|block|20/20|0.83887 / 1|0.05943|
|TEST|SPARSE|wald|0/20|0 / 0.16113|0.82016|
|TEST|NOISY|wald|20/20|0.83887 / 1|1.34819|
|TEST|NOISY|pairs|20/20|0.83887 / 1|1.3372|
|TEST|NOISY|block|19/20|0.76386 / 0.99112|1.29127|
|TEST|FLAT|wald|20/20|0.83887 / 1|0.0608|
|TEST|COST20|wald|19/20|0.76386 / 0.99112|0.06087|
|TEST|COST60|wald|17/20|0.63958 / 0.94763|0.06052|
|TEST|BOUNDARY|wald|19/20|0.76386 / 0.99112|0.06169|
|CHALLENGE|DISCRETE130|wald|11/12|0.64611 / 0.98514|0.12816|
|CHALLENGE|DISCRETE130|pairs|11/12|0.64611 / 0.98514|0.13028|
|CHALLENGE|DISCRETE130|block|12/12|0.7575 / 1|0.12141|
|CHALLENGE|DISCRETE180|wald|11/12|0.64611 / 0.98514|0.09804|
|CHALLENGE|DISCRETE180|pairs|12/12|0.7575 / 1|0.09726|
|CHALLENGE|DISCRETE180|block|11/12|0.64611 / 0.98514|0.08819|
|CHALLENGE|DISCRETE365|wald|12/12|0.7575 / 1|0.06087|
|CHALLENGE|DISCRETE365|pairs|12/12|0.7575 / 1|0.05859|
|CHALLENGE|DISCRETE365|block|12/12|0.7575 / 1|0.05674|
|CHALLENGE|DISCRETE700|wald|12/12|0.7575 / 1|0.04191|
|CHALLENGE|DISCRETE700|pairs|12/12|0.7575 / 1|0.03951|
|CHALLENGE|DISCRETE700|block|12/12|0.7575 / 1|0.04015|
|CHALLENGE|CONTINUOUS365|wald|11/12|0.64611 / 0.98514|0.08482|
|CHALLENGE|CONTINUOUS365|pairs|11/12|0.64611 / 0.98514|0.08385|
|CHALLENGE|CONTINUOUS365|block|11/12|0.64611 / 0.98514|0.09081|
|CHALLENGE|CONTINUOUS700|wald|11/12|0.64611 / 0.98514|0.05843|
|CHALLENGE|PLATEAU|wald|10/12|0.55196 / 0.95304|0.05888|
|CHALLENGE|NARROW|wald|12/12|0.7575 / 1|0.23632|
|CHALLENGE|CALENDAR|wald|12/12|0.7575 / 1|0.16974|
|CHALLENGE|PROMOTION|wald|11/12|0.64611 / 0.98514|0.0614|
|CHALLENGE|HIDDEN_MARKETING|wald|0/12|0 / 0.2425|0.06087|
|CHALLENGE|HIDDEN_MARKETING|pairs|0/12|0 / 0.2425|0.05859|
|CHALLENGE|HIDDEN_MARKETING|block|0/12|0 / 0.2425|0.05674|
|CHALLENGE|COMPETITOR|wald|0/12|0 / 0.2425|0.1085|
|CHALLENGE|HOLIDAY|wald|11/12|0.64611 / 0.98514|0.28043|
|CHALLENGE|SHIFT|wald|11/12|0.64611 / 0.98514|0.11592|
|CHALLENGE|STOCKOUT|wald|10/12|0.55196 / 0.95304|0.07492|
|CHALLENGE|GAPS|wald|10/12|0.55196 / 0.95304|0.07314|
|CHALLENGE|MISSING_COST|wald|12/12|0.7575 / 1|0.06093|
|CHALLENGE|WRONG_COST|wald|12/12|0.7575 / 1|0.06091|
|CHALLENGE|REFUNDS|wald|12/12|0.7575 / 1|0.06007|
|CHALLENGE|WEAK|wald|12/12|0.7575 / 1|0.06027|
|CHALLENGE|STRONG|wald|10/12|0.55196 / 0.95304|0.06181|
|CHALLENGE|ZERO_RESPONSE|wald|12/12|0.7575 / 1|0.06074|
|CHALLENGE|ZERO_RESPONSE|pairs|11/12|0.64611 / 0.98514|0.06049|
|CHALLENGE|ZERO_RESPONSE|block|12/12|0.7575 / 1|0.06621|
|CHALLENGE|SPARSE|wald|0/12|0 / 0.2425|0.80319|
|CHALLENGE|NOISY|wald|9/12|0.46769 / 0.91106|1.26945|
|CHALLENGE|NOISY|pairs|9/12|0.46769 / 0.91106|1.30072|
|CHALLENGE|NOISY|block|9/12|0.46769 / 0.91106|1.10265|
|CHALLENGE|FLAT|wald|11/12|0.64611 / 0.98514|0.05969|
|CHALLENGE|COST20|wald|11/12|0.64611 / 0.98514|0.06005|
|CHALLENGE|COST60|wald|11/12|0.64611 / 0.98514|0.06032|
|CHALLENGE|BOUNDARY|wald|11/12|0.64611 / 0.98514|0.06137|

## Experimental restrictive policies

Wald requires a negative upper endpoint, preserving the original approved price. Block shadow is fail-closed when the family was not selected for bootstrap; this whole-matrix comparison includes that deliberate coverage restriction and must not be read as comparative estimator skill. No new recommendations are created. See machine-readable family results for the supported subset.

|Split|Policy|Safe approved/total|Unsafe approved/total|Indeterminate approved/total|Abstained/total|
|---|---|---|---|---|---|
|DEV|production|29/52|12/52|16/36|83/140|
|DEV|wald|27/52|12/52|16/36|85/140|
|DEV|block|8/52|4/52|0/36|128/140|
|TEST|production|146/260|65/260|80/180|409/700|
|TEST|wald|136/260|65/260|80/180|419/700|
|TEST|block|40/260|20/260|0/180|640/700|
|CHALLENGE|production|89/156|41/156|48/108|242/420|
|CHALLENGE|wald|82/156|41/156|48/108|249/420|
|CHALLENGE|block|24/156|12/156|0/108|384/420|

## Matched bootstrap-family comparison

All nine prespecified bootstrap families, including unavailable fits; identical population for both policies.

|Split|Policy|Safe A/W|Unsafe A/W|Indeterminate A/W|N|
|---|---|---|---|---|---|
|DEV|production|10/14|4/4|0/4|36|
|DEV|experimental|8/16|4/4|0/4|36|
|TEST|production|51/69|20/20|0/20|180|
|TEST|experimental|40/80|20/20|0/20|180|
|CHALLENGE|production|31/41|12/12|0/12|108|
|CHALLENGE|experimental|24/48|12/12|0/12|108|
