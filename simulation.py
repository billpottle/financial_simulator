from matplotlib.backends.backend_pdf import PdfPages
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from datetime import datetime

# Set up the export file name
now = datetime.now()
timestamp = now.strftime("%Y%m%d_%H%M%S")
pdf_filename = f"simulation_results_{timestamp}.pdf"
pdf_pages = PdfPages(pdf_filename)


# Format function to add commas to y-axis labels
def millions(x, pos):
    return f'{x:,.0f}'

formatter = FuncFormatter(millions)

# Import main data
data_path = 'inputs.csv' 
data = pd.read_csv(data_path)
data = data.set_index('Item').to_dict()['Value']
np.random.seed(int(data['Random Seed']))
NUM_SIMULATIONS = int(data['Simulations'])
NUM_YEARS = int(data['Years'])
initial_investable_assets = data['Investable Assets']
expected_annual_return = data['Expected Return Mean']
expected_annual_volatility = data['Expected Return SD']
initial_yearly_expenses = data['Expected Expenses Mean']
expenses_volatility = data['Expected Expenses SD']
inflation = data['Inflation']
unexpected_expense_chance = data['Unexpected Expense Chance']
unexpected_expense_amount = data['Unexpected Expense Amount']
passive_income = data['Additional Passive Income']
years_to_work = data['Years to Work']
active_income = data['Active Income']
tax_rate = data['Tax Rate']
active_income_growth_rate = data['Active Income Growth Rate']
passive_income_growth_rate = data['Passive Income Growth Rate']
depletion_threshold = data['Depletion Threshold']

# Import optional lump sum data
try:
    # Try to load the data from lump_sums.csv
    lump_sums_data = pd.read_csv("lump_sums.csv")
    lump_sum_changes = lump_sums_data.set_index('Year').to_dict()['Amount']
except FileNotFoundError:
    # If the file is not found, set lump_sum_changes to an empty dictionary
    lump_sum_changes = {}
    print("Optional file: lump_sums.csv not found, proceeding without it")


# Initialize empty variables
assets_over_years = np.zeros((NUM_SIMULATIONS, NUM_YEARS))
net_asset_income_over_years = np.zeros((NUM_SIMULATIONS, NUM_YEARS))
expenses_over_years = np.zeros((NUM_SIMULATIONS, NUM_YEARS))
taxes_over_years = np.zeros((NUM_SIMULATIONS, NUM_YEARS))
passive_income_over_years = np.zeros((NUM_SIMULATIONS, NUM_YEARS))
lump_sums_over_years = np.zeros((NUM_SIMULATIONS, NUM_YEARS))
unexpected_expenses_over_years = np.zeros(NUM_YEARS)


# Calculating active_income_over_years which will be the same in all simulations
active_income_over_years = []

for year in range(NUM_YEARS):
    if year < years_to_work:
        income_for_year = active_income * (1 + active_income_growth_rate) ** year
        active_income_over_years.append(income_for_year)
    else:
        active_income_over_years.append(0)

active_income_over_years = np.array(active_income_over_years)

# Calculating passive income_over_years which will be the same in all simulations
passive_income_over_years = []

for year in range(NUM_YEARS):
        passive_income_for_year = passive_income * (1 + passive_income_growth_rate) ** year
        passive_income_over_years.append(passive_income_for_year)

passive_income_over_years = np.array(passive_income_over_years)


# Function to run the simulation
def run_simulation():
 
    for sim in range(NUM_SIMULATIONS):
        assets = initial_investable_assets
        for year in range(NUM_YEARS):
            # Applying lump sum changes if any
            if year + 1 in lump_sum_changes:
                assets += lump_sum_changes[year + 1]
                lump_sums_over_years[sim, year] = lump_sum_changes[year + 1]

            # Updating assets based on return and expenses
            if assets > 0:
                yearly_assets = np.random.normal(expected_annual_return / 100, expected_annual_volatility / 100) * assets
            else: 
                yearly_assets = 0;

            yearly_expenses = np.random.normal(initial_yearly_expenses, expenses_volatility)
            # Adjust for inflation
            yearly_expenses = yearly_expenses * ((1 + inflation) ** year)

            # Calculating unexpected expenses for the year
            if np.random.rand() < unexpected_expense_chance:
                yearly_expenses += unexpected_expense_amount
                unexpected_expenses_over_years[year] += 1


            # Adjust for taxes
            income_for_the_year = active_income_over_years[year] + passive_income_over_years[year]
            assets_to_sell = 0
            taxes_paid = 0
            if yearly_expenses > income_for_the_year:
                amount_needed_after_taxes = yearly_expenses - income_for_the_year
                assets_to_sell = amount_needed_after_taxes / (1 - tax_rate)
                taxes_paid = assets_to_sell - amount_needed_after_taxes
            
            
            assets += yearly_assets
            assets -= yearly_expenses
            assets -= taxes_paid

            assets += active_income_over_years[year]
            assets += passive_income_over_years[year]

            assets_over_years[sim, year] = assets
            expenses_over_years[sim, year] = yearly_expenses 
            net_asset_income_over_years[sim, year] = yearly_assets
            taxes_over_years[sim,year] = taxes_paid


    return 


# Function to generate the results table
def generate_results_table():
    median_assets = np.median(assets_over_years, axis=0)
    income_from_assets = np.median(net_asset_income_over_years, axis=0)
    annual_expenses = np.median(expenses_over_years, axis=0)
    annual_taxes = np.median(taxes_over_years, axis=0)
  
    # Prepare the table
    results_df = pd.DataFrame({
        'Year': range(1, 21),
        'Assets': [f"${x:,.0f}" for x in median_assets],
        'Income from Assets': [f"${x:,.0f}" for x in income_from_assets],
        'Expenses': [f"${x:,.0f}" for x in annual_expenses],
        'Investment Taxes': [f"${x:,.0f}" for x in annual_taxes],
        'Lump Sum Changes': [lump_sum_changes.get(i, "$0") for i in range(1, 21)],
        
    })
    return results_df


def generate_results_table():
    median_assets = np.median(assets_over_years, axis=0)
    income_from_assets = np.median(net_asset_income_over_years, axis=0)
    annual_expenses = np.median(expenses_over_years, axis=0)
    annual_taxes = np.median(taxes_over_years, axis=0)
  
    # Prepare the table
    results_df = pd.DataFrame({
        'Year': range(1, 21),
        'Assets': [f"${x:,.0f}" for x in median_assets],
        'Income from Assets': [f"${x:,.0f}" for x in income_from_assets],
        'Expenses': [f"${x:,.0f}" for x in annual_expenses],
        'Investment Taxes': [f"${x:,.0f}" for x in annual_taxes],
        'Lump Sum Changes': [lump_sum_changes.get(i, "$0") for i in range(1, 21)],
    })
    
    fig, ax = plt.subplots(figsize=(15, 8))
    ax.axis('off')
    # Plotting the table with matplotlib
    table = ax.table(cellText=results_df.values,
                 colLabels=results_df.columns,
                 cellLoc='center',
                 loc='center',
                 colColours=['#0000FF'] * results_df.shape[1])  # Change header color to blue

# Modify header text properties
    table.auto_set_font_size(False)
    for (i, j), cell in table.get_celld().items():
        if i == 0:  # 0 is the index of the header row
            cell.set_text_props(fontweight='bold', color='white')  # Set text to bold and white
            cell.set_fontsize(14)  # Adjust font size if necessary

    plt.tight_layout()
    pdf_pages.savefig(fig)
    plt.close()
    return results_df

def calculate_end_stats(): 
    # Calculating and displaying end-of-simulation stats
    end_of_simulation_assets = assets_over_years[:, -1]
    years_of_depletion = np.argmax(assets_over_years <= depletion_threshold, axis=1)
    never_depleted = years_of_depletion == 0
    years_of_depletion[never_depleted] = NUM_YEARS + 1  # For those never depleted, set to one year more than total
    median_year_depleted = np.median(years_of_depletion[years_of_depletion != NUM_YEARS + 1])
    # 1. Adjusting the depletion percentage calculation
    simulations_with_depletion = np.any(assets_over_years <= depletion_threshold, axis=1)
    depletion_percentage = np.sum(simulations_with_depletion) / NUM_SIMULATIONS * 100

    count_satisfying_simulations = 0
    first_exceeding_years_list = []

    # Iterate over each simulation
    for i in range(NUM_SIMULATIONS):
        # Extracting the net asset income for the current simulation
        net_asset_income_simulation = net_asset_income_over_years[i, :]
    
        # Calculate the combined income (net asset income + passive income) for the current simulation
        combined_income_simulation = net_asset_income_simulation + passive_income_over_years
    
        # Find the first year where combined income exceeded expenses
        exceeding_years = np.where(combined_income_simulation > expenses_over_years[i, :])[0]
    
        # If there are any years where income exceeded expenses
        if len(exceeding_years) > 0:
            first_exceeding_year = exceeding_years[0]
            # Calculate the total combined income from the first exceeding year to the end
            total_income_subsequent_years = np.sum(combined_income_simulation[first_exceeding_year:])
        
            # Calculate the total expenses from the first exceeding year to the end
            total_expenses_subsequent_years = np.sum(expenses_over_years[i, first_exceeding_year:])
            # Check if total combined income for subsequent years exceeded total expenses
            if total_income_subsequent_years > total_expenses_subsequent_years:
                count_satisfying_simulations += 1
                first_exceeding_years_list.append(first_exceeding_year)


        # Calculate the median of the first exceeding year for the selected simulations
    median_first_exceeding_year = np.median(first_exceeding_years_list)


    # Print the insights
    print("\nKey Insights")
    print(f"Median investable assets left at the end: ${np.median(end_of_simulation_assets):,.0f}")
    print(f"Percentage of simulations where assets were ever depleted: {depletion_percentage:.2f}%")
    if median_year_depleted == NUM_YEARS + 1  or np.isnan(median_year_depleted):
        print(f"Median year assets depleted: Never")
    else:
        print(f"Median year assets depleted: Year {median_year_depleted:.1f}")
    print(f"Percentage of simulations acheiving escape velocity: {(count_satisfying_simulations * 100 / NUM_SIMULATIONS):.2f}%")
    print(f"Median first year escape: {median_first_exceeding_year:.0f}")
 
    # Prepare the data for the table export
    data = [
        ["Median investable assets left at the end", f"${np.median(end_of_simulation_assets):,.0f}"],
        ["Percentage of simulations where assets were ever depleted", f"{depletion_percentage:.2f}%"],
        ["Median year assets depleted", f"Year {median_year_depleted:.1f}" if median_year_depleted != NUM_YEARS + 1  and not np.isnan(median_year_depleted) else "Never"],
        ["Percentage of simulations achieving escape velocity", f"{(count_satisfying_simulations * 100 / NUM_SIMULATIONS):.2f}%"],
        ["Median first year escape", f"{median_first_exceeding_year:.0f}"]
    ]

    column_labels = ["Insight", "Value"]

    # Create a new figure and axis
    fig, ax = plt.subplots(figsize=(10, 5))


    ax.axis('off')
    ax.axis('tight')

    # Create the table
    table = ax.table(cellText=data, colLabels=column_labels, cellLoc='center', loc='center')

    # Modify header text properties
    table.auto_set_font_size(False)
    table.set_fontsize(12)
    table.auto_set_column_width(col=[0, 1])

    # Set header color to blue and text properties to bold with white color
    table.auto_set_font_size(False)
    for (i, j), cell in table.get_celld().items():
        if i == 0:  # 0 is the index of the header row
            cell.set_facecolor('#0000FF')  # Set header color to blue
            cell.set_text_props(fontweight='bold', color='white')  # Set text to bold and white
            cell.set_fontsize(14)  # Adjust font size if necessary

    # Set the title
    plt.title('Key Insights')

    pdf_pages.savefig(fig)
    plt.close()


def plot_one(): 
    # Visualization of Assets over Years
    plt.figure(figsize=(10, 5))
    for sim in range(NUM_SIMULATIONS):
        plt.plot(range(NUM_YEARS), assets_over_years[sim, :], color='blue', alpha=0.1)
    plt.title('Assets over Years for Each Simulation')
    plt.xlabel('Years')
    plt.ylabel('Assets ($)')
    plt.grid(True)
    plt.gca().yaxis.set_major_formatter(formatter)
    pdf_pages.savefig(plt.gcf())

def plot_two(): 
    # Scatterplot of investable assets for each year
    y_axis_limit = np.percentile(assets_over_years, 97.5)  # Excluding the top 5% of values as outliers
    medians = np.median(assets_over_years, axis=0)  # Compute the medians

    # Adding year 0 and initial_investable_assets to medians
    extended_years = [0] + list(range(1, NUM_YEARS + 1))
    extended_medians = [initial_investable_assets] + list(medians)

    # Prepending a column of initial_investable_assets values to assets_over_years
    year_0_data = np.full((NUM_SIMULATIONS, 1), initial_investable_assets)
    assets_over_years_with_0 = np.hstack((year_0_data, assets_over_years))

    # Now, we'll plot the data with the new 0th year data
    plt.figure(figsize=(15, 7))

    # Plotting the extended median line
    plt.plot(extended_years, extended_medians, color='red', marker='o', label='Median', zorder=2)

    # Box plots for all years including year 0
    boxprops = dict(linestyle='-', linewidth=1, color='blue')
    medianprops = dict(linestyle='-', linewidth=0)
    plt.boxplot(assets_over_years_with_0, vert=True, patch_artist=True, widths=0.6, boxprops=boxprops, medianprops=medianprops, positions=extended_years)

    # Setting title, labels, and other properties
    plt.title('Box Plot of Investable Assets Over Years')
    plt.xlabel('Year')
    plt.ylabel('Investable Assets')
    plt.grid(True, which='both', linestyle='--', linewidth=0.5)
    plt.xticks(extended_years)
    plt.ylim(-initial_investable_assets, y_axis_limit)
    plt.xlim(0, NUM_YEARS + 1)  # Ensuring x-axis limits cover all years
    plt.legend()
    plt.gca().yaxis.set_major_formatter(formatter)
    pdf_pages.savefig(plt.gcf())

def plot_three():

    years = np.arange(1, NUM_YEARS + 1)
    plt.figure(figsize=(12, 8))

    # Median plots
    plt.plot(years, np.median(net_asset_income_over_years, axis=0), '-o', label="Median Net Asset Income", color='blue')
    plt.plot(years, np.median(expenses_over_years, axis=0), '-o', label="Median Expenses", color='red')

    # One-dimensional array plots
    plt.plot(years, active_income_over_years, '-o', label="Active Income", color='green')
    plt.plot(years, passive_income_over_years, '-o', label="Passive Income", color='purple')

    plt.title("Income and Expenses Over Years")
    plt.xlabel("Years")
    plt.ylabel("Amount ($)")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    pdf_pages.savefig(plt.gcf())

def plot_four(): 
    # Plot With Lump Sum Changes
    plt.figure(figsize=(12, 8))
    years = np.arange(1, NUM_YEARS + 1)
    # Median plots
    plt.plot(years, np.median(net_asset_income_over_years, axis=0), '-o', label="Median Net Asset Income", color='blue')
    plt.plot(years, np.median(expenses_over_years, axis=0), '-o', label="Median Expenses", color='red')

    # One-dimensional array plots
    plt.plot(years, active_income_over_years, '-o', label="Active Income", color='green')
    plt.plot(years, passive_income_over_years, '-o', label="Passive Income", color='purple')

    # Adding markers for lump sum changes
    for year, change in lump_sum_changes.items():
        plt.scatter(year, change, color='black', s=100, zorder=5, marker="x", label=f"Lump Sum Change (Year {year})")

    plt.title("Income and Expenses Over Years with Lump Sum Changes")
    plt.xlabel("Years")
    plt.ylabel("Amount ($)")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    pdf_pages.savefig(plt.gcf())

def plot_five(): 
    # Calculate the percentage of expenses covered by passive income and income from assets for each year
    # For the passive_income_over_years, we'll use broadcasting to add its values to each row of net_asset_income_over_years

    # Broadcasting the one-dimensional passive_income_over_years across all simulations
    percentage_covered = (net_asset_income_over_years + passive_income_over_years[np.newaxis, :]) / expenses_over_years * 100
    # Create the box plot
    # Create the corrected box plot without transposing the data
    plt.figure(figsize=(15, 10))
    plt.boxplot(percentage_covered, patch_artist=True)
    years = np.arange(1, NUM_YEARS + 1)
    # Adding the horizontal green line at 100%
    plt.axhline(y=100, color='green', linestyle='-', linewidth=4, label="100% Coverage")

    # Setting labels, title, and layout
    plt.title("Distribution of Percentage of Expenses Covered by Passive and Asset Income Over Years")
    plt.xlabel("Years")
    plt.ylabel("Percentage Covered (%)")
    plt.xticks(ticks=np.arange(1, NUM_YEARS + 1), labels=years)
    plt.grid(True, which='both', linestyle='--', linewidth=0.5, axis='y')
    plt.tight_layout()
    pdf_pages.savefig(plt.gcf())

# Running the simulation using the data
run_simulation()

# Displaying the results table
print(generate_results_table())
calculate_end_stats()

plot_one()
plot_two()
plot_three()
plot_four()
plot_five()

pdf_pages.close()
input('Press return to exit...')
