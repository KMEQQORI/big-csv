const fs = require('fs');
const readline = require('readline');
const { sortDate, lessThanDate, parseJsonField, splitLineToColumns } = require('./helpers');

const FILE_NAME = 'data.csv'; // csv file name
const RESULT_FILE_NAME = 'users.json'; // the result json file name
const COUNT_OF_RECORDS_TO_SAVE = 1517; // the count of records to be extracted in the result json file
const RECORD_UNIQUE_ATTRIBUTES = 'uid'; // the attributes to be used to have unique records
const RECORD_SORTING_ATTRIBUTES = 'createdAt'; // the attributes to be used to compare dates
const NUMBER_OF_RECORDS_PROGRESS_DISPLAY = 10000; // the interval to display progress

const main = async () => {
	let latestRecordList = [];
	let csvHeaders = null;
	let lineCounter = 0;

	const originalFileStream = fs.createReadStream(FILE_NAME);
	const lineReader = readline.createInterface({ input: originalFileStream });

	for await (const line of lineReader) {
		if (!csvHeaders) {
			// find the csv header => json attributes names
			csvHeaders = splitLineToColumns(line);
			if (csvHeaders.indexOf(RECORD_UNIQUE_ATTRIBUTES) === -1 || csvHeaders.indexOf(RECORD_UNIQUE_ATTRIBUTES) === -1) {
				throw new Error(`couldn't find the unique/sorting attributes in the CSV file`);
			}
		} else {
			const lineJsonRecord = convertLineToJsonRecord(csvHeaders, line);
			latestRecordList = saveRecord(lineJsonRecord, latestRecordList);
		}

		// just to display progress and detects anomalies
		if (lineCounter % NUMBER_OF_RECORDS_PROGRESS_DISPLAY === 0) console.log(`${lineCounter} lines processed`);
		lineCounter++;
	}

	// save the result file
	fs.writeFile(RESULT_FILE_NAME, JSON.stringify(latestRecordList), error => {
		if (error) {
			console.log('error while saving the result file.');
			console.error(error);
			throw error;
		}
		console.log(`done ${lineCounter} lines processed ! the result file generated successfully.`);
	});
};

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

function saveRecord(currentReccord, savedRecordList) {
	// first phase : filling the array
	// conditions : to have unique record per user
	if (savedRecordList.length < COUNT_OF_RECORDS_TO_SAVE) {
		return fillWithEveryUniqueRecord(currentReccord, savedRecordList);
	}

	// second phase selecting users
	// conditions : to have unique record per user and keep only latest users.
	const oldestRecordCreationDate = savedRecordList[savedRecordList.length - 1][RECORD_SORTING_ATTRIBUTES];
	if (
		savedRecordList.length === COUNT_OF_RECORDS_TO_SAVE &&
		lessThanDate(oldestRecordCreationDate, currentReccord[RECORD_SORTING_ATTRIBUTES])
	) {
		const existingUserRecordIndex = savedRecordList.findIndex(function (record) {
			return record[RECORD_UNIQUE_ATTRIBUTES] === currentReccord[RECORD_UNIQUE_ATTRIBUTES];
		});

		const shouldReplaceOldRecord =
			existingUserRecordIndex !== -1 &&
			lessThanDate([existingUserRecordIndex][RECORD_SORTING_ATTRIBUTES], currentReccord[RECORD_SORTING_ATTRIBUTES]);

		if (shouldReplaceOldRecord) {
			// delete old record from the list if needed
			savedRecordList.splice(existingUserRecordIndex, 1);
		}

		const newRecordIndex = savedRecordList.findIndex(function (record) {
			return lessThanDate(record[RECORD_SORTING_ATTRIBUTES], currentReccord[RECORD_SORTING_ATTRIBUTES]);
		});

		// cut the first part and add the new record
		const firstPart = savedRecordList.slice(0, newRecordIndex);
		firstPart.push(currentReccord);

		//cut the second part and delete the latest element if needed
		const endIndex = shouldReplaceOldRecord ? savedRecordList.length : savedRecordList.length - 1;
		const secondPart = savedRecordList.slice(newRecordIndex, endIndex);

		return firstPart.concat(secondPart);
	}

	return savedRecordList;
}

function fillWithEveryUniqueRecord(currentReccord, savedRecordList) {
	const existingUserRecordIndex = savedRecordList.findIndex(function (record) {
		return record[RECORD_UNIQUE_ATTRIBUTES] === savedRecordList[RECORD_UNIQUE_ATTRIBUTES];
	});

	if (existingUserRecordIndex === -1) {
		savedRecordList.push(currentReccord);

		if (savedRecordList.length === COUNT_OF_RECORDS_TO_SAVE) {
			// when the array is full sort the list in desc to have the latest record in the end of it
			savedRecordList = savedRecordList.sort((recordA, recordB) =>
				sortDate(recordA[RECORD_SORTING_ATTRIBUTES], recordB[RECORD_SORTING_ATTRIBUTES])
			);
			console.log('list first filling done. \n start selecting records ...');
		}
	}

	return savedRecordList;
}

main();
