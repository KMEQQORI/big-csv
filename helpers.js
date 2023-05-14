function splitLineToColumns(line) {
	let splitLock = false;
	let columnStart = 0;
	let columnList = [];
	let tmpWord = null;
	for (let i = 0; i < line.length; i++) {
		// lock spliting until opened quote is closed
		if (line[i - 1] !== '"' && line[i] === '"' && line[i + 1] !== '"') {
			splitLock = !splitLock;
		}
		// if spliting no locked => split at , and at the end of line
		if (!splitLock && (line[i] === ',' || i === line.length - 1)) {
			tmpWord = transformDoubleQuotesToSingles(deleteQuotesFromQuotedValue(line.substring(columnStart, i)));
			columnList.push(tmpWord);
			columnStart = i + 1;
		}
	}
	return columnList;
}

function transformDoubleQuotesToSingles(value) {
	return value.replaceAll('""', '"');
}

function deleteQuotesFromQuotedValue(value) {
	return value[0] === '"' && value[value.length - 1] === '"' ? value.substring(1, value.length - 1) : value;
}

function parseJsonField(value) {
	try {
		return JSON.parse(value);
	} catch (error) {
		return value;
	}
}

// to handle date attributes and other types as well
function lessThanDate(valueA, valueB) {
	try {
		return new Date(valueA) < new Date(valueB);
	} catch (error) {
		return valueA < valueB;
	}
}

// to handle date attributes and other types as well
function sortDate(valueA, valueB) {
	try {
		return new Date(valueB) - new Date(valueA);
	} catch (error) {
		return valueB - valueA;
	}
}

module.exports = {
	splitLineToColumns,
	transformDoubleQuotesToSingles,
	deleteQuotesFromQuotedValue,
	parseJsonField,
	lessThanDate,
	sortDate
};
