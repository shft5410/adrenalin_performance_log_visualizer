const fileInputElement = document.querySelector('#header__file-input')
const chartContainerElement = document.querySelector('.main__chart-container')

/* Full palette: https://coolors.co/palette/0b090a-161a1d-660708-a4161a-ba181b-e5383b-b1a7a6-d3d3d3-f5f3f4-ffffff */
const COLORS = {
	light: getCSSVar('--color-light'),
	dark: getCSSVar('--color-dark'),
	accent1: getCSSVar('--color-accent-1'),
	accent2: getCSSVar('--color-accent-2'),
}

const BASE_PLOT_LAYOUT = {
	// Layout options, refer to https://plotly.com/javascript/reference/layout/
	paper_bgcolor: COLORS.dark,
	plot_bgcolor: COLORS.dark,
	colorway: [COLORS.accent2],
	font: {
		color: COLORS.light,
	},
	yaxis: {
		gridcolor: COLORS.accent1,
	},
	xaxis: {
		gridcolor: COLORS.accent1,
	},
}

const PLOT_CONFIG = {
	// Config options, refer to https://plotly.com/javascript/configuration-options/
	displaylogo: false,
	responsive: true,
}

// Get value of CSS variable
function getCSSVar(varName) {
	return getComputedStyle(document.documentElement).getPropertyValue(varName)
}

// Read the file as text
function readFileAsText(file) {
	return new Promise((resolve) => {
		if (!file) resolve(null)
		const reader = new FileReader()
		reader.readAsText(file, 'UTF-8')
		reader.onload = (e) => {
			resolve(e.target.result)
		}
		reader.onerror = () => resolve(null)
	})
}

// Parse CSV to time series
function parseCSVToTimeSeries(csv) {
	const lines = csv
		.trim() // Remove leading and trailing whitespace
		.split(/\r\n|\n/) // Split by newline
		.map((line) => line.split(',')) // Split by comma
	const headers = lines.shift().slice(1) // Get headers and remove timestamp
	const timestamps = lines.map((line) => line.shift()) // Get timestamps and remove them from lines
	// Convert lines to series of values
	const dataseries = lines.reduce((acc, line) => {
		line.forEach((value, i) => {
			acc[i] ?? (acc[i] = []) // Initialize array if it doesn't exist
			acc[i].push(value) // Push value to array
		})
		return acc
	}, [])
	dataseries.forEach((data, i) => {
		const values = data.map((value) => Number(value))
		const countNaN = values.filter((value) => isNaN(value)).length
		if (countNaN === 0) {
			dataseries[i] = { type: 'number', values }
		} else if (countNaN === values.length) {
			const strMap = [] // Mapping of nums (representing the index of a map element) to string values
			const nums = data.map((value) => {
				const i = strMap.indexOf(value) // Check if value already exists in map
				if (i !== -1) return i // If it does, return the index
				return strMap.push(value) - 1 // If it doesn't, push it to the map and return the index
			})
			dataseries[i] = {
				type: 'string',
				values: nums,
				labels: strMap,
			}
		} else {
			dataseries[i] = {
				type: 'number',
				values: values.map((value) => (isNaN(value) ? 0 : value)),
			}
		}
	})
	return { headers, timestamps, dataseries }
}

// Create a charts
function createCharts({ headers, timestamps, dataseries }) {
	// Clear the container
	Array.from(chartContainerElement.children).forEach((child) => child.remove())
	// Create a chart for each header
	headers.forEach((header, i) => {
		const series = dataseries[i]
		// Create chart container
		const chartElement = document.createElement('div')
		chartElement.classList.add('chart')
		// Create plot using Plotly
		const trace = {
			x: timestamps,
			y: series.values,
			type: 'scatter',
		}

		const layout = {
			...BASE_PLOT_LAYOUT,
			title: header,
			width: chartContainerElement.clientWidth,
		}
		if (series.type === 'string') {
			layout.yaxis.tickvals = series.labels.map((_, i) => i)
			layout.yaxis.ticktext = series.labels
		} else {
			layout.yaxis.tickvals = undefined
			layout.yaxis.ticktext = undefined
		}
		Plotly.newPlot(chartElement, [trace], layout, PLOT_CONFIG)
		// Append elements to the container
		chartContainerElement.appendChild(chartElement)
	})
}

// Listen for file input changes
fileInputElement.addEventListener('change', async (e) => {
	const f = e.target.files[0]
	if (!f) return
	const csv = await readFileAsText(f)
	const timeseries = parseCSVToTimeSeries(csv)
	console.log(timeseries)
	createCharts(timeseries)
})
