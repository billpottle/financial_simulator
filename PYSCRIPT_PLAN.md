# Plan: Add PyScript HTML Deployment

This document outlines steps to offer a self-contained HTML interface for running the financial simulator directly in the browser using [PyScript](https://pyscript.net/). The goal is for users to download a single HTML file and run simulations locally without Python installed.

## Objectives
- Provide an HTML page that replicates the functionality of `simulation.py` using PyScript.
- Allow users to input parameters through form fields instead of editing `inputs.csv` and `lump_sums.csv`.
- Run the simulation entirely in the user's browser so data stays local.
- Produce the same charts and tables as the existing Python script.

## Proposed Steps
1. **Create `simulation_pyscript.html`**
   - Include the PyScript tag and load required Python packages (`numpy`, `pandas`, `matplotlib`).
   - Add an input form capturing all parameters currently stored in `inputs.csv` and optional lump sums.
   - Provide a "Run Simulation" button.

2. **Adapt Python Code for the Browser**
   - Move the simulation logic from `simulation.py` into functions that can run in PyScript.
   - Remove file I/O and read inputs directly from the form fields.
   - Display generated plots in the HTML page using PyScript's display helpers.
   - Optionally allow users to download the generated PDF if PyScript supports file saving.

3. **Integrate with Existing Repo Structure**
   - Keep `simulation.py` for command‑line/desktop use.
   - Add the new HTML file and any related JavaScript or CSS under a folder such as `web/`.
   - Update `.gitignore` if needed for build artifacts.

4. **Update Documentation**
   - Add instructions in `README.md` describing the browser-based approach:
     1. Download `simulation_pyscript.html`.
     2. Open the file in a modern browser with no internet connection required.
     3. Enter financial parameters and run the simulation.
   - Clarify that this option requires no Python installation or `.exe` file.

5. **Testing**
   - Verify that the simulation produces equivalent results when running via PyScript.
   - Ensure all plots render correctly in the browser and match the PDF output.

Following this plan will provide a simple offline method for users to run simulations while keeping their data private.
