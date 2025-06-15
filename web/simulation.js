// Financial Simulator - JavaScript Implementation
// Replaces PyScript with native JavaScript + Chart.js

// Global state
let assetList = [];
let lumpSums = new Map();
let charts = [];
let rng = null;

// Utility functions
function stripCommas(str) {
    return str.replace(/,/g, '');
}

function formatCurrency(num) {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}

// Box-Muller transform for normal distribution
function randomNormal(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while(u === 0) u = rng(); // Converting [0,1) to (0,1)
    while(v === 0) v = rng();
    
    const z0 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return z0 * stdDev + mean;
}

// Input parsing and validation
function parseInputs() {
    const getValue = (id) => stripCommas(document.getElementById(id).value);
    
    // Compute portfolio stats from asset list
    let totalVal = 0;
    let weightedMean = 0;
    let weightedVar = 0;
    
    if (assetList.length > 0) {
        totalVal = assetList.reduce((sum, asset) => sum + asset.value, 0);
        const weights = assetList.map(asset => asset.value / totalVal);
        weightedMean = assetList.reduce((sum, asset, i) => sum + weights[i] * asset.mean, 0);
        weightedVar = assetList.reduce((sum, asset, i) => sum + (weights[i] ** 2) * (asset.sd ** 2), 0);
    }
    
    const params = {
        'Random Seed': parseInt(getValue('seed')),
        'Years': parseInt(getValue('years')),
        'Simulations': parseInt(getValue('sims')),
        'Tax Rate': parseFloat(getValue('tax_rate')),
        'Inflation': parseFloat(getValue('inflation')),
        'Depletion Threshold': parseFloat(getValue('depletion')),
        'Investable Assets': totalVal,
        'Expected Return Mean': weightedMean,
        'Expected Return SD': Math.sqrt(weightedVar),
        'Expected Expenses Mean': parseFloat(getValue('exp_mean')),
        'Expected Expenses SD': parseFloat(getValue('exp_sd')),
        'Unexpected Expense Chance': parseFloat(getValue('unexpected_chance')),
        'Unexpected Expense Amount': parseFloat(getValue('unexpected_amount')),
        'Additional Passive Income': parseFloat(getValue('passive_income')),
        'Passive Income Growth Rate': parseFloat(getValue('passive_growth')),
        'Active Income': parseFloat(getValue('active_income')),
        'Active Income Growth Rate': parseFloat(getValue('active_growth')),
        'Years to Work': parseInt(getValue('years_work'))
    };
    
    return { params, lumpSums };
}

// Core Monte Carlo simulation
function runSimulation(params, lumpSumChanges) {
    // Set up seeded random number generator
    rng = new Math.seedrandom(params['Random Seed']);
    
    const NUM_SIMULATIONS = params['Simulations'];
    const NUM_YEARS = params['Years'];
    const initialInvestableAssets = params['Investable Assets'];
    const expectedAnnualReturn = params['Expected Return Mean'];
    const expectedAnnualVolatility = params['Expected Return SD'];
    const initialYearlyExpenses = params['Expected Expenses Mean'];
    const expensesVolatility = params['Expected Expenses SD'];
    const inflation = params['Inflation'];
    const unexpectedExpenseChance = params['Unexpected Expense Chance'];
    const unexpectedExpenseAmount = params['Unexpected Expense Amount'];
    const passiveIncome = params['Additional Passive Income'];
    const yearsToWork = params['Years to Work'];
    const activeIncome = params['Active Income'];
    const taxRate = params['Tax Rate'];
    const activeIncomeGrowthRate = params['Active Income Growth Rate'];
    const passiveIncomeGrowthRate = params['Passive Income Growth Rate'];
    
    // Initialize result arrays
    const assetsOverYears = Array(NUM_SIMULATIONS).fill().map(() => Array(NUM_YEARS).fill(0));
    const netAssetIncomeOverYears = Array(NUM_SIMULATIONS).fill().map(() => Array(NUM_YEARS).fill(0));
    const expensesOverYears = Array(NUM_SIMULATIONS).fill().map(() => Array(NUM_YEARS).fill(0));
    const taxesOverYears = Array(NUM_SIMULATIONS).fill().map(() => Array(NUM_YEARS).fill(0));
    
    // Calculate income streams
    const activeIncomeOverYears = Array(NUM_YEARS).fill(0).map((_, year) => {
        if (year < yearsToWork) {
            return activeIncome * Math.pow(1 + activeIncomeGrowthRate, year);
        }
        return 0;
    });
    
    const passiveIncomeOverYears = Array(NUM_YEARS).fill(0).map((_, year) => {
        return passiveIncome * Math.pow(1 + passiveIncomeGrowthRate, year);
    });
    
    // Run simulations
    for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
        let assets = initialInvestableAssets;
        
        for (let year = 0; year < NUM_YEARS; year++) {
            // Apply lump sum changes
            if (lumpSumChanges.has(year + 1)) {
                assets += lumpSumChanges.get(year + 1);
            }
            
            // Calculate asset returns
            let yearlyAssets = 0;
            if (assets > 0) {
                yearlyAssets = randomNormal(expectedAnnualReturn / 100, expectedAnnualVolatility / 100) * assets;
            }
            
            // Calculate expenses
            let yearlyExpenses = randomNormal(initialYearlyExpenses, expensesVolatility);
            yearlyExpenses *= Math.pow(1 + inflation, year);
            
            // Add unexpected expenses
            if (rng() < unexpectedExpenseChance) {
                yearlyExpenses += unexpectedExpenseAmount;
            }
            
            // Calculate taxes and asset sales
            const incomeForTheYear = activeIncomeOverYears[year] + passiveIncomeOverYears[year];
            let taxesPaid = 0;
            
            if (yearlyExpenses > incomeForTheYear) {
                const amountNeededAfterTaxes = yearlyExpenses - incomeForTheYear;
                const assetsToSell = amountNeededAfterTaxes / (1 - taxRate);
                taxesPaid = assetsToSell - amountNeededAfterTaxes;
            }
            
            // Update assets
            assets += yearlyAssets;
            assets -= yearlyExpenses;
            assets -= taxesPaid;
            assets += activeIncomeOverYears[year];
            assets += passiveIncomeOverYears[year];
            
            // Store results
            assetsOverYears[sim][year] = assets;
            expensesOverYears[sim][year] = yearlyExpenses;
            netAssetIncomeOverYears[sim][year] = yearlyAssets;
            taxesOverYears[sim][year] = taxesPaid;
        }
    }
    
    return {
        assetsOverYears,
        netAssetIncomeOverYears,
        expensesOverYears,
        taxesOverYears,
        passiveIncomeOverYears,
        activeIncomeOverYears,
        depletionThreshold: params['Depletion Threshold']
    };
}

// Generate results table
function generateResultsTable(data) {
    const medianAssets = data.assetsOverYears[0].map((_, yearIdx) => {
        const yearData = data.assetsOverYears.map(sim => sim[yearIdx]);
        return ss.median(yearData);
    });
    
    const incomeFromAssets = data.netAssetIncomeOverYears[0].map((_, yearIdx) => {
        const yearData = data.netAssetIncomeOverYears.map(sim => sim[yearIdx]);
        return ss.median(yearData);
    });
    
    const annualExpenses = data.expensesOverYears[0].map((_, yearIdx) => {
        const yearData = data.expensesOverYears.map(sim => sim[yearIdx]);
        return ss.median(yearData);
    });
    
    const annualTaxes = data.taxesOverYears[0].map((_, yearIdx) => {
        const yearData = data.taxesOverYears.map(sim => sim[yearIdx]);
        return ss.median(yearData);
    });
    
    return medianAssets.map((assets, i) => ({
        Year: i + 1,
        Assets: `$${formatCurrency(assets)}`,
        'Income from Assets': `$${formatCurrency(incomeFromAssets[i])}`,
        'Expenses': `$${formatCurrency(annualExpenses[i])}`,
        'Investment Taxes': `$${formatCurrency(annualTaxes[i])}`
    }));
}

// Calculate end statistics
function calculateEndStats(data, params) {
    const assetsOverYears = data.assetsOverYears;
    const depletionThreshold = params['Depletion Threshold'];
    const NUM_SIMULATIONS = assetsOverYears.length;
    const NUM_YEARS = assetsOverYears[0].length;
    
    const endOfSimulationAssets = assetsOverYears.map(sim => sim[NUM_YEARS - 1]);
    
    // Calculate depletion statistics
    const yearsOfDepletion = assetsOverYears.map(sim => {
        const depletionYear = sim.findIndex(assets => assets <= depletionThreshold);
        return depletionYear === -1 ? NUM_YEARS + 1 : depletionYear;
    });
    
    const neverDepleted = yearsOfDepletion.filter(year => year === NUM_YEARS + 1);
    const depleted = yearsOfDepletion.filter(year => year !== NUM_YEARS + 1);
    const medianYearDepleted = depleted.length > 0 ? ss.median(depleted) : NUM_YEARS + 1;
    
    const simulationsWithDepletion = assetsOverYears.filter(sim => 
        sim.some(assets => assets <= depletionThreshold)
    );
    const depletionPercentage = (simulationsWithDepletion.length / NUM_SIMULATIONS) * 100;
    
    // Calculate FEV statistics
    let countSatisfyingSimulations = 0;
    const firstExceedingYearsList = [];
    
    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        const netAssetIncomeSimulation = data.netAssetIncomeOverYears[i];
        const combinedIncomeSimulation = netAssetIncomeSimulation.map((income, year) => 
            income + data.passiveIncomeOverYears[year]
        );
        
        const exceedingYears = combinedIncomeSimulation
            .map((income, year) => income > data.expensesOverYears[i][year] ? year : -1)
            .filter(year => year !== -1);
            
        if (exceedingYears.length > 0) {
            const firstExceedingYear = exceedingYears[0];
            const totalIncomeSubsequentYears = combinedIncomeSimulation
                .slice(firstExceedingYear)
                .reduce((sum, income) => sum + income, 0);
            const totalExpensesSubsequentYears = data.expensesOverYears[i]
                .slice(firstExceedingYear)
                .reduce((sum, expense) => sum + expense, 0);
                
            if (totalIncomeSubsequentYears > totalExpensesSubsequentYears) {
                countSatisfyingSimulations++;
                firstExceedingYearsList.push(firstExceedingYear);
            }
        }
    }
    
    const medianFirstExceedingYear = firstExceedingYearsList.length > 0 ? 
        ss.median(firstExceedingYearsList) : 0;
    
    return {
        "Median investable assets left at the end": `$${formatCurrency(ss.median(endOfSimulationAssets))}`,
        "Percentage of simulations where assets were ever depleted": `${depletionPercentage.toFixed(2)}%`,
        "Median year assets depleted": medianYearDepleted !== NUM_YEARS + 1 && !isNaN(medianYearDepleted) ? 
            `Year ${medianYearDepleted.toFixed(1)}` : "Never",
        "Percentage of simulations achieving escape velocity": `${((countSatisfyingSimulations * 100) / NUM_SIMULATIONS).toFixed(2)}%`,
        "Median first year escape": `${medianFirstExceedingYear.toFixed(0)}`
    };
}

// Destroy existing charts
function destroyOldCharts() {
    charts.forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    charts = [];
}

// Create charts using Chart.js
function createCharts(data, params) {
    destroyOldCharts();
    
    const resultsDiv = document.getElementById('results');
    const NUM_YEARS = data.assetsOverYears[0].length;
    const initialInvestableAssets = params['Investable Assets'];
    
    // Chart 1: Individual simulation trajectories
    const chartContainer1 = document.createElement('div');
    chartContainer1.className = 'chart-container';
    chartContainer1.innerHTML = '<canvas id="trajectoryChart"></canvas>';
    resultsDiv.appendChild(chartContainer1);
    
    const ctx1 = document.getElementById('trajectoryChart').getContext('2d');
    const trajectoryLabels = Array.from({ length: NUM_YEARS }, (_, i) => i + 1);
    const trajectoryData = {
        labels: trajectoryLabels,
        datasets: data.assetsOverYears.slice(0, Math.min(50, data.assetsOverYears.length)).map((sim, i) => ({
            label: `Simulation ${i + 1}`,
            data: sim, // direct numeric array aligns with labels
            borderColor: 'rgba(0, 123, 255, 0.15)',
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.1,
            fill: false
        }))
    };
    
    charts.push(new Chart(ctx1, {
        type: 'line',
        data: trajectoryData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Assets over Years for Each Simulation'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Years'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Assets ($)'
                    }
                }
            }
        }
    }));
    
    // Chart 2: Box plot of assets over years
    const chartContainer2 = document.createElement('div');
    chartContainer2.className = 'chart-container';
    chartContainer2.innerHTML = '<canvas id="boxPlotChart"></canvas>';
    resultsDiv.appendChild(chartContainer2);
    
    const ctx2 = document.getElementById('boxPlotChart').getContext('2d');
    
    // Calculate medians and box plot data
    const medians = data.assetsOverYears[0].map((_, yearIdx) => {
        const yearData = data.assetsOverYears.map(sim => sim[yearIdx]);
        return ss.median(yearData);
    });
    
    const extendedYears = [0, ...Array.from({length: NUM_YEARS}, (_, i) => i + 1)];
    const extendedMedians = [initialInvestableAssets, ...medians];
    
    // Box plot data for each year
    const boxPlotData = extendedYears.map(year => {
        if (year === 0) {
            return {
                x: year,
                min: initialInvestableAssets,
                q1: initialInvestableAssets,
                median: initialInvestableAssets,
                q3: initialInvestableAssets,
                max: initialInvestableAssets
            };
        }
        
        const yearData = data.assetsOverYears.map(sim => sim[year - 1]);
        yearData.sort((a, b) => a - b);
        
        return {
            x: year,
            min: ss.min(yearData),
            q1: ss.quantile(yearData, 0.25),
            median: ss.median(yearData),
            mean: ss.mean(yearData),
            q3: ss.quantile(yearData, 0.75),
            max: ss.max(yearData)
        };
    });
    
    charts.push(new Chart(ctx2, {
        type: 'boxplot',
        data: {
            labels: extendedYears,
            datasets: [{
                label: 'Asset Distribution',
                data: boxPlotData,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }, {
                label: 'Median',
                type: 'line',
                data: extendedMedians.map((value, i) => ({ x: i, y: value })),
                borderColor: 'red',
                backgroundColor: 'red',
                pointBackgroundColor: 'red',
                pointBorderColor: 'red',
                pointRadius: 4,
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Box Plot of Investable Assets Over Years'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const v = context.raw;
                            if (!v || typeof v !== 'object') return '';
                            return [
                                `Min: $${formatCurrency(v.min)}`,
                                `Q1: $${formatCurrency(v.q1)}`,
                                `Median: $${formatCurrency(v.median)}`,
                                `Mean: $${formatCurrency(v.mean)}`,
                                `Q3: $${formatCurrency(v.q3)}`,
                                `Max: $${formatCurrency(v.max)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Investable Assets ($)'
                    }
                }
            }
        }
    }));
    
    // Chart 3: Income vs Expenses
    const chartContainer3 = document.createElement('div');
    chartContainer3.className = 'chart-container';
    chartContainer3.innerHTML = '<canvas id="incomeExpensesChart"></canvas>';
    resultsDiv.appendChild(chartContainer3);
    
    const ctx3 = document.getElementById('incomeExpensesChart').getContext('2d');
    
    const medianNetAssetIncome = data.netAssetIncomeOverYears[0].map((_, yearIdx) => {
        const yearData = data.netAssetIncomeOverYears.map(sim => sim[yearIdx]);
        return ss.median(yearData);
    });
    
    const medianExpenses = data.expensesOverYears[0].map((_, yearIdx) => {
        const yearData = data.expensesOverYears.map(sim => sim[yearIdx]);
        return ss.median(yearData);
    });
    
    const years = Array.from({length: NUM_YEARS}, (_, i) => i + 1);
    
    charts.push(new Chart(ctx3, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Median Net Asset Income',
                data: medianNetAssetIncome,
                borderColor: 'blue',
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                fill: false
            }, {
                label: 'Median Expenses',
                data: medianExpenses,
                borderColor: 'red',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                fill: false
            }, {
                label: 'Active Income',
                data: data.activeIncomeOverYears,
                borderColor: 'green',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                fill: false
            }, {
                label: 'Passive Income',
                data: data.passiveIncomeOverYears,
                borderColor: 'purple',
                backgroundColor: 'rgba(128, 0, 128, 0.1)',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Income and Expenses Over Years'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Years'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    }
                }
            }
        }
    }));
    
    // Chart 4: Income vs Expenses with Lump Sums
    if (lumpSums.size > 0) {
        const chartContainer4 = document.createElement('div');
        chartContainer4.className = 'chart-container';
        chartContainer4.innerHTML = '<canvas id="incomeExpensesLumpChart"></canvas>';
        resultsDiv.appendChild(chartContainer4);
        
        const ctx4 = document.getElementById('incomeExpensesLumpChart').getContext('2d');
        
        const lumpSumData = Array.from(lumpSums.entries()).map(([year, amount]) => ({
            x: year,
            y: amount
        }));
        
        charts.push(new Chart(ctx4, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Median Net Asset Income',
                    data: medianNetAssetIncome,
                    borderColor: 'blue',
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    fill: false,
                    type: 'line'
                }, {
                    label: 'Median Expenses',
                    data: medianExpenses,
                    borderColor: 'red',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    fill: false,
                    type: 'line'
                }, {
                    label: 'Active Income',
                    data: data.activeIncomeOverYears,
                    borderColor: 'green',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    fill: false,
                    type: 'line'
                }, {
                    label: 'Passive Income',
                    data: data.passiveIncomeOverYears,
                    borderColor: 'purple',
                    backgroundColor: 'rgba(128, 0, 128, 0.1)',
                    fill: false,
                    type: 'line'
                }, {
                    label: 'Lump Sum Changes',
                    data: lumpSumData,
                    borderColor: 'black',
                    backgroundColor: 'black',
                    pointRadius: 8,
                    pointStyle: 'cross',
                    showLine: false,
                    type: 'scatter'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Income and Expenses Over Years with Lump Sum Changes'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Years'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amount ($)'
                        }
                    }
                }
            }
        }));
    }
    
    // Chart 5: Percentage Coverage Box Plot
    const chartContainer5 = document.createElement('div');
    chartContainer5.className = 'chart-container';
    chartContainer5.innerHTML = '<canvas id="coverageChart"></canvas>';
    resultsDiv.appendChild(chartContainer5);
    
    const ctx5 = document.getElementById('coverageChart').getContext('2d');
    
    // Calculate percentage covered for each year
    const percentageCoveredData = years.map(year => {
        const yearIdx = year - 1;
        const coverageData = data.netAssetIncomeOverYears.map((sim, simIdx) => {
            const netAssetIncome = sim[yearIdx];
            const passiveIncome = data.passiveIncomeOverYears[yearIdx];
            const expenses = data.expensesOverYears[simIdx][yearIdx];
            return ((netAssetIncome + passiveIncome) / expenses) * 100;
        });
        
        coverageData.sort((a, b) => a - b);
        
        return {
            x: year,
            min: ss.min(coverageData),
            q1: ss.quantile(coverageData, 0.25),
            median: ss.median(coverageData),
            q3: ss.quantile(coverageData, 0.75),
            max: ss.max(coverageData)
        };
    });
    
    charts.push(new Chart(ctx5, {
        type: 'boxplot',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Coverage Distribution',
                    data: percentageCoveredData,
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                },
                {
                    label: '100% Coverage',
                    type: 'line',
                    data: years.map(() => 100),
                    borderColor: 'green',
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribution of Percentage of Expenses Covered'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Years'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Percentage Covered (%)'
                    }
                }
            }
        }
    }));
}

// Render tables
function renderTable(data, title) {
    const resultsDiv = document.getElementById('results');
    
    const tableContainer = document.createElement('div');
    tableContainer.className = 'results-table';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    tableContainer.appendChild(titleElement);
    
    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    tableContainer.appendChild(table);
    resultsDiv.appendChild(tableContainer);
}

// Asset management functions
function updateAssetsTable() {
    const tbody = document.getElementById('assets_body');
    tbody.innerHTML = '';
    
    assetList.forEach((asset, idx) => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = asset.name;
        row.appendChild(nameCell);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = `$${formatCurrency(asset.value)}`;
        row.appendChild(valueCell);
        
        const meanCell = document.createElement('td');
        meanCell.textContent = `${asset.mean.toFixed(2)}%`;
        row.appendChild(meanCell);
        
        const sdCell = document.createElement('td');
        sdCell.textContent = `${asset.sd.toFixed(2)}%`;
        row.appendChild(sdCell);
        
        const actionCell = document.createElement('td');
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '-';
        removeBtn.onclick = () => removeAsset(idx);
        actionCell.appendChild(removeBtn);
        row.appendChild(actionCell);
        
        tbody.appendChild(row);
    });
}

function addAsset() {
    const name = document.getElementById('asset_name').value.trim();
    const value = parseFloat(stripCommas(document.getElementById('asset_value').value)) || 0;
    const mean = parseFloat(document.getElementById('asset_ret_mean').value) || 0;
    const sd = parseFloat(document.getElementById('asset_ret_sd').value) || 0;
    
    const errorEl = document.getElementById('asset_error');
    let errorMessage = '';
    
    if (!name) {
        errorMessage = 'Name is required.';
    } else if (value <= 0) {
        errorMessage = 'Value must be positive.';
    } else if (mean === 0) {
        errorMessage = 'Expected return mean cannot be 0 (positive or negative allowed).';
    } else if (sd <= 0) {
        errorMessage = 'Expected return SD must be positive.';
    }
    
    if (errorMessage) {
        errorEl.textContent = errorMessage;
        return;
    } else {
        errorEl.textContent = '';
    }
    
    assetList.push({ name, value, mean, sd });
    updateAssetsTable();
    
    // Clear inputs
    document.getElementById('asset_name').value = '';
    document.getElementById('asset_value').value = '';
    document.getElementById('asset_ret_mean').value = '';
    document.getElementById('asset_ret_sd').value = '';
}

function removeAsset(idx) {
    if (idx >= 0 && idx < assetList.length) {
        assetList.splice(idx, 1);
        updateAssetsTable();
    }
}

// Lump sum management functions
function updateLumpSumsTable() {
    const tbody = document.getElementById('lump_sums_body');
    tbody.innerHTML = '';
    
    Array.from(lumpSums.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([year, amount]) => {
            const row = document.createElement('tr');
            
            const yearCell = document.createElement('td');
            yearCell.textContent = year.toString();
            row.appendChild(yearCell);
            
            const amountCell = document.createElement('td');
            amountCell.textContent = `$${formatCurrency(amount)}`;
            row.appendChild(amountCell);
            
            const actionCell = document.createElement('td');
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => removeLumpSum(year);
            actionCell.appendChild(removeBtn);
            row.appendChild(actionCell);
            
            tbody.appendChild(row);
        });
}

function addLumpSum() {
    const year = parseInt(document.getElementById('lump_year').value);
    const amount = parseFloat(stripCommas(document.getElementById('lump_amount').value)) || 0;
    const maxYears = parseInt(document.getElementById('years').value);
    
    if (year < 1 || year > maxYears) {
        return;
    }
    
    lumpSums.set(year, amount);
    updateLumpSumsTable();
    
    // Clear inputs
    document.getElementById('lump_year').value = '1';
    document.getElementById('lump_amount').value = '0';
}

function removeLumpSum(year) {
    lumpSums.delete(year);
    updateLumpSumsTable();
}

// PDF Export function
async function exportToPDF() {
    const exportBtn = document.getElementById('export_pdf');
    exportBtn.style.display = 'none';
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(20);
    pdf.text("Financial Simulation Report", 20, 20);
    
    // Add timestamp
    pdf.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    pdf.text(`Generated on: ${timestamp}`, 20, 30);
    
    // Add input parameters
    pdf.setFontSize(12);
    pdf.text("Simulation Parameters:", 20, 45);
    
    let yPosition = 55;
    const { params } = parseInputs();
    
    for (const [key, value] of Object.entries(params)) {
        let displayValue = value;
        if (typeof value === 'number' && !Number.isInteger(value)) {
            displayValue = value.toFixed(2);
        }
        pdf.setFontSize(10);
        pdf.text(`${key}: ${displayValue}`, 25, yPosition);
        yPosition += 7;
    }
    
    // Add lump sums
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.text("Lump Sums:", 20, yPosition);
    yPosition += 10;
    
    if (lumpSums.size > 0) {
        pdf.setFontSize(10);
        for (const [year, amount] of Array.from(lumpSums.entries()).sort(([a], [b]) => a - b)) {
            pdf.text(`Year ${year}: $${formatCurrency(amount)}`, 25, yPosition);
            yPosition += 7;
        }
    } else {
        pdf.text("No lump sums defined", 25, yPosition);
        yPosition += 7;
    }
    
    // Add charts and tables
    const resultsDiv = document.getElementById('results');
    
    // Convert each chart to canvas and add to PDF
    for (const canvas of resultsDiv.querySelectorAll('canvas')) {
        pdf.addPage();
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, 20, 170, 100);
    }
    
    // Add tables
    for (const table of resultsDiv.querySelectorAll('table')) {
        pdf.addPage();
        const canvas = await html2canvas(table);
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 20, 20, 170, 100);
    }
    
    // Save the PDF
    pdf.save('financial_simulation_report.pdf');
    
    // Show the export button again
    exportBtn.style.display = 'inline-block';
}

// Main simulation runner
async function runSim() {
    const runButton = document.getElementById('run');
    runButton.textContent = 'Simulating...';
    runButton.disabled = true;
    
    // Clear previous results
    document.getElementById('results').innerHTML = '';
    
    try {
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const { params, lumpSums: lumpSumChanges } = parseInputs();
        const simData = runSimulation(params, lumpSumChanges);
        
        // Generate and display results table
        const resultsTable = generateResultsTable(simData);
        renderTable(resultsTable, 'Simulation Results by Year');
        
        // Calculate and display statistics
        const stats = calculateEndStats(simData, params);
        const statsTable = Object.entries(stats).map(([key, value]) => ({
            Insight: key,
            Value: value
        }));
        renderTable(statsTable, 'Key Insights');
        
        // Create charts
        createCharts(simData, params);
        
        // Show export button
        document.getElementById('export_pdf').style.display = 'inline-block';
        
    } catch (error) {
        console.error('Simulation error:', error);
        document.getElementById('results').innerHTML = `<div style="color: red; padding: 20px;">Error running simulation: ${error.message}</div>`;
    } finally {
        runButton.textContent = 'Run Simulation';
        runButton.disabled = false;
    }
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', function() {
    // Asset management
    document.getElementById('add_asset').addEventListener('click', addAsset);
    
    // Lump sum management
    document.getElementById('add_lump_sum').addEventListener('click', addLumpSum);
    
    // Main simulation
    document.getElementById('run').addEventListener('click', runSim);
    
    // PDF export
    document.getElementById('export_pdf').addEventListener('click', exportToPDF);
    
    // Toggle sections
    document.getElementById('toggle_assets').addEventListener('click', function() {
        const section = document.getElementById('assets_section');
        const button = this;
        if (section.style.display === 'none') {
            section.style.display = 'block';
            button.textContent = '-';
        } else {
            section.style.display = 'none';
            button.textContent = '+';
        }
    });
    
    document.getElementById('toggle_lumps').addEventListener('click', function() {
        const section = document.getElementById('lump_section');
        const button = this;
        if (section.style.display === 'none') {
            section.style.display = 'block';
            button.textContent = '-';
        } else {
            section.style.display = 'none';
            button.textContent = '+';
        }
    });
    
    // Modal functionality
    const instructionsModal = document.getElementById('instructionsModal');
    const fevModal = document.getElementById('fevModal');
    const cardModal = document.getElementById('cardInfoModal');
    
    document.getElementById('openInstructions').addEventListener('click', () => {
        instructionsModal.style.display = 'block';
    });
    
    document.getElementById('openFEV').addEventListener('click', () => {
        fevModal.style.display = 'block';
    });
    
    document.getElementById('closeInstructions').addEventListener('click', () => {
        instructionsModal.style.display = 'none';
    });
    
    document.getElementById('closeFEV').addEventListener('click', () => {
        fevModal.style.display = 'none';
    });
    
    document.getElementById('closeCardInfo').addEventListener('click', () => {
        cardModal.style.display = 'none';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === instructionsModal) instructionsModal.style.display = 'none';
        if (e.target === fevModal) fevModal.style.display = 'none';
        if (e.target === cardModal) cardModal.style.display = 'none';
    });
    
    // Info button functionality
    const infoContent = {
        general: `<h2>General Parameters</h2><p>These parameters control the overall simulation length and randomness.</p><ul><li><b>Random Seed</b>: ensures repeatable runs.</li><li><b>Years</b>: duration of the simulation.</li><li><b>Simulations</b>: number of Monte Carlo trials to run.</li><li><b>Tax Rate</b>: percentage applied to capital gains when assets are sold.</li><li><b>Inflation</b>: annual increase applied to expenses.</li><li><b>Depletion Threshold</b>: asset level considered "out of money".</li></ul>`,
        assets: `<h2>Assets</h2><p>Add each investable asset you own.</p><ul><li><b>Name</b>: descriptive label.</li><li><b>Value ($)</b>: current market value.</li><li><b>Expected Return Mean (%)</b>: average annual return.</li><li><b>Expected Return SD (%)</b>: annual volatility.</li></ul><p>The simulator automatically computes a weighted portfolio return and volatility.</p>`,
        active: `<h2>Active Income</h2><p>Your employment or business income.</p><ul><li><b>Active Income ($)</b>: after-tax annual pay.</li><li><b>Active Income Growth Rate (%)</b>: expected yearly raises.</li><li><b>Years to Work</b>: number of years this income is earned.</li></ul>`,
        passive: `<h2>Passive Income</h2><p>Recurring income streams such as pensions, Social Security, or rental income.</p><ul><li><b>Additional Passive Income ($)</b>: current annual amount.</li><li><b>Passive Income Growth Rate (%)</b>: expected yearly change (can be negative).</li></ul>`,
        expenses: `<h2>Expenses</h2><p>Annual living costs and their variability.</p><ul><li><b>Expected Expenses Mean ($)</b>: typical yearly spending.</li><li><b>Expected Expenses SD ($)</b>: variability of that spending.</li><li><b>Unexpected Expense Chance (%)</b>: probability of a surprise expense each year.</li><li><b>Unexpected Expense Amount ($)</b>: size of that surprise cost.</li></ul>`,
        lumps: `<h2>Lump Sums</h2><p>Add one-off future cash flows.</p><ul><li><b>Year</b>: simulation year (1-n).</li><li><b>Amount ($)</b>: positive for income, negative for expenses.</li></ul>`
    };
    
    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const key = btn.getAttribute('data-info');
            document.getElementById('cardInfoBody').innerHTML = infoContent[key] || '';
            cardModal.style.display = 'block';
        });
    });
    
    // Number formatting for currency inputs
    function addFormatListeners(input) {
        input.addEventListener('focus', function() {
            input.value = input.value.replace(/,/g, '');
        });
        input.addEventListener('blur', function() {
            if (input.value !== '') {
                const num = Number(input.value.replace(/,/g, ''));
                if (!isNaN(num)) {
                    input.value = num.toLocaleString('en-US');
                }
            }
        });
    }
    
    document.querySelectorAll('input.format-number').forEach(addFormatListeners);

    // Register boxplot / violin controllers for @sgratzl/chartjs-chart-boxplot (needed for Chart.js v4)
    if (Chart.BoxPlotController && !Chart.registry.controllers.get('boxplot')) {
        Chart.register(
            Chart.BoxPlotController,
            Chart.ViolinPlotController || Chart.ViolinController || Chart.Violin,
            Chart.BoxPlotElement || Chart.BoxAndWhiskers,
            Chart.ViolinPlotElement || Chart.Violin
        );
    }
});
