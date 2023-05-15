const fs = require('fs');
const readline = require('readline');

const FILE_NAME = 'data.csv'; // csv file name
const RESULT_FILE_NAME = 'users.json'; // the result json file name

const main = async () => {
	let latestRecordMap = {};
	let csvHeaders = null;
	let lineCounter = 0;

	const originalFileStream = fs.createReadStream(FILE_NAME);
	const lineReader = readline.createInterface({ input: originalFileStream });

	for await (const line of lineReader) {
		if (!csvHeaders) {
			// find the csv header => json attributes names
			csvHeaders = splitLineToColumns(line);
		} else {
			const lineJsonRecord = convertLineToJsonRecord(csvHeaders, line);
			latestRecordMap = saveRecord(lineJsonRecord, latestRecordMap);
		}
		// just to display progress and detects anomalies
		if (lineCounter % 1000 === 0) console.log(`${lineCounter} lines processed`);
		lineCounter++;
	}

	// converting map to output array
	const savedRecordArray  = Object.values(latestRecordMap).map((record)=>{
		return record;
	}).sort((recordA, recordB) =>
		new Date(recordB.createdAt) - new Date(recordA.createdAt)
	);
	console.log(savedRecordArray.length);

	// save the result file
	fs.writeFile(RESULT_FILE_NAME, JSON.stringify(savedRecordArray), error => {
		if (error) {
			console.log('error while saving the result file.');
			console.error(error);
			throw error;
		}
		console.log(`done ${lineCounter} lines processed ! the result file generated successfully.`);
	});
};

function saveRecord(currentReccord, savedRecordList) {
	if (!!savedRecordList[currentReccord.uid]
		&& new Date(savedRecordList[currentReccord.uid].createdAt) <= new Date(currentReccord.createdAt)) {
		savedRecordList[currentReccord.uid]=currentReccord;
	}else if(!savedRecordList[currentReccord.uid]){
		savedRecordList[currentReccord.uid]=currentReccord;
	}
	return savedRecordList;
}

function convertLineToJsonRecord(headers, line) {
	const tmpJsonObject = {};
	const tmpLineData = splitLineToColumns(line);

	if (headers.length !== tmpLineData.length) {
		throw new Error('the CSV file may be corrupted');
	}
	headers.forEach((header, index) => {
		tmpJsonObject[header] = parseJsonField(tmpLineData[index]);
	});
	return tmpJsonObject;
}

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
	if(columnList.length!==11) console.log("wrong test")
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

main();
