# Financial Simulator
Flexible Monte Carlo simulator for personal finance with PDF output of charts and tables.

<p align="center"> <i>It's hard to make predictions - especially about the future. - Yogi Berra </i> </p>

A major financial goal that many people have is being able to afford to retire, broadly defined as being able to stop working and not run out of money before death. An easier goal is to be able to afford to work in an area you are passionate about but that might pay less. 

## How to Run

Download the file simulation.html and open it locally with any modern browser. This ensures that all the information you enter is private and never leaves your machine. 

Click on the 'Intrepreting Results', 'What is FEV', and information buttons in each section for important usage instructions. 

## Results

Results will appear in the browser directly and you can also export a pdf file.

<p align="center">
  <img src="assets_over_years.jpg?raw=true" alt="Different Path Trajectories">
  <br>
  <i>Sample of 100 different financial path trajectories. Note that best and worst case scenarious diverge more as time goes on</i>
</p>


If no one ever had any unexpected expenses, and you could predict the return of every asset class perfectly, then personal finance would be easy because there would be one 'right' or 'best' answer. However, in the real world there is a lot of uncertainty. This program models this using a 'Monte Carlo' approach - basically running many random simulations and doing statistics on the result. 

## How to Use

Most people would vary the input parameters and run multiple simulations. This could help you answer questions like:

- How many years will you need to work?
- How sensitive is your situation to unexpected expenses?
- How will refinancing your mortgage today affect your future 10 years from now?
- How much you will be able to afford to contribute to children's college expenses in 12 years?
- How will your situation change with 3% vs 5% inflation?



**Taxes** - Taxes are paid only as necessary. For instance, if your active income from working (after tax) + passive income (after tax) is higher than your expenses for the year, no assets will be sold and you will pay no tax. Otherwise, assets will be sold. For example, if you earned $50,000, but spent $60,000, you will need to sell $11,764 of assets, which will include $10,000 to cover the shortfall and $1,764 in taxes (at 15% rate). The simulation assumes all asset sales are subject to capital gains tax at your specified tax rate. When setting your gains rate, consider long term vs short term or simply use a weighted average.


| Item      | Description |
| ----------- | ----------- |
| Expected Expenses Mean   | How much you plan to spend each year.        |
| Expected Expenses SD   | Volatility of your expenses.       |
| Inflation   | How much things will increase in price each year.      |
| Unexpected Expense Amount   | How much you would have to cover.     |
| Unexpected Expense Chance   | Chance unexpected expense happens.      |

Everyone will have that one medical bill, broken [thing], need to help family, etc. The default values assume a 15% chance of a $10,000 expense each year. 


| Item      | Description |
| ----------- | ----------- |
| Additional Passive Income   | Amount per year after tax.       |
| Passive Income Growth Rate   | Percent per year. Could be negative.       |
| Active Income   | Amount per year you earn for working after tax.      |
| Active Income Growth Rate   | Percent per year.     |
| Years To Work  | How many years you will earn active income.     |

Passive Income could include things like Social Security, Pensions, Rental Property Income, etc. The **Depletion Threshold** is the point where you would consider yourself 'out of money'.

### Lump Sums

You can also add include lump sums in your calculations. Negative numbers indicate expenses. For example, the user will pay $20,000 for college in years 9-12. Positive numbers indicate income - you might also expect to receive a $15,000 insurance settlement in year 4. Each year should have only the net amount. 



