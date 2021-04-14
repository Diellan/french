'use strict';

function keyup(e){
	switch (e.key) {
		case '1':
			trackWord(false);
			break;
		case '2':
			trackWord(true);
			break;
		case ' ':
			progressSlide();
			break;
		case 'p':
			displayPause();
			break;
		case 'f':
			displayFinish();
			break;
	}
}

document.addEventListener('DOMContentLoaded', function () {
	document.body.addEventListener('keyup', keyup);
	document.getElementById('submitForm').addEventListener('click', submitForm);
	document.getElementById('step-one').style.display = 'flex';
});

let currentWord;
let currentWordIndex = -1;
let isPractice = true;
let state = 'start';
let results = [];
let words = [];
let user = {};

function runPractice(){
	user.practiceStart = Date.now();
	words = [].concat(window.wordBank.practiceEnglish).concat(window.wordBank.practiceNonEnglish);
	shuffleArray(words);
	currentWordIndex = 0;
	runNextWord();
}

function runExperiment(){
	user.experimentStart = Date.now();
	words = [].concat(window.wordBank.english).concat(window.wordBank.hebrew).concat(window.wordBank.trueNonWords);
	shuffleArray(words);
	currentWordIndex = 0;
	runNextWord();
}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function runNextWord() {
	let word = words[currentWordIndex];
	let wordElement = document.getElementById('word');
	wordElement.innerHTML = '+';

	setTimeout(function(){
		let result = {
			stimWord: word.stimWord,
			onsetTime: Date.now(),
			WordType: word.type,
			WordStatus: 'NULL',
			trialsDataList: 'NULL',
			TrueNonWordsList: 'NULL',
			ItemNum: word.ItemNum,
			isPrac: isPractice,
			valid: word.type === 'EnTrueWord' || word.type === 'HebWord'
		};

		results.push(result);

		if (!isPractice) {
			result.WordStatus = result.valid ? 'word' : 'nonword';
		}

		currentWord = word.stimWord;
		wordElement.innerHTML = currentWord;
	}, 500);
}

function trackWord(valid){
	if (!currentWord) return;
	let result = results[results.length - 1];
	result.reactionTime = Date.now();
	result.reaction = result.reactionTime - result.onsetTime;
	result.response = valid ? 2 : 1;
	result.accuracy = result.valid === valid;

	currentWordIndex++;
	currentWord = null;

	if (!words[currentWordIndex]) {
		displayFinish();
	} else if (currentWordIndex > 25 && currentWordIndex < words.length - 25 && currentWordIndex % 25 === 1) {
		displayPause();
	} else {
		if (isPractice && result.accuracy)
			document.getElementById('word').innerHTML = '<img src="correct.png" />';
		else if (isPractice && !result.accuracy)
			document.getElementById('word').innerHTML = '<img src="incorrect.png" />';
		else
			document.getElementById('word').innerHTML = '';
		setTimeout(function(){
			runNextWord();
		}, 1500);
	}
}

function displayPause(){
	document.getElementById('word-container').style.display = 'none';
	document.getElementById('step-pause').style.display = 'flex';
	state = 'pause';
}

function displayFinish(){
	document.getElementById('word-container').style.display = 'none';
	if (isPractice) {
		document.getElementById('step-four').style.display = 'flex';
		isPractice = false;
		state = 'four';
	} else {
		document.getElementById('step-form').style.display = 'flex';
		state = 'form';
	}
}

function progressSlide(){
	switch(state){
		case 'start':
			document.getElementById('step-one').style.display = 'none';
			document.getElementById('step-two').style.display = 'flex';
			state = 'two';
			break;
		case 'two':
			document.getElementById('step-two').style.display = 'none';
			document.getElementById('step-three').style.display = 'flex';
			state = 'three';
			break;
		case 'three':
			document.getElementById('step-three').style.display = 'none';
			document.getElementById('word-container').style.display = 'flex';
			runPractice();
			state = 'practice';
			break;
		case 'four':
			document.getElementById('step-four').style.display = 'none';
			document.getElementById('word-container').style.display = 'flex';
			runExperiment();
			state = 'experiment';
			break;
		case 'pause':
			document.getElementById('step-pause').style.display = 'none';
			document.getElementById('word-container').style.display = 'flex';
			state = 'experiment';
			document.getElementById('word').innerHTML = '';
			setTimeout(function(){
				runNextWord();
			}, 1500);
			break;
	}
}

let submitAttempts = 0;
function submitResults(){
	document.getElementById('step-loading').style.display = 'flex';
	firebase.database().ref('results').push().set({
		results: results,
		user: user
	}).then(function(){
		document.getElementById('step-loading').style.display = 'none';
		document.getElementById('step-finish').style.display = 'flex';
	}).catch(function(){
		console.log('Error submitting results', arguments);
		submitAttempts++;
		if (submitAttempts === 2) alert('Error submitting results.');
		setTimeout(submitResults, 1000);
	});
}

function submitForm(){
	if (submitAttempts > 0) return; // just in case lag or something makes it come here again

	let handedness = document.getElementById("handedness");
	if (!document.getElementById('age').value
		|| !document.getElementById('languages').value || document.getElementById('handedness').selectedIndex === 0) {
		alert('Please fill in all the form fields.');
		return;
	}

	user.sex = document.getElementById('sex').value;
	user.age = document.getElementById('age').value;
	user.handedness = handedness.options[handedness.selectedIndex].text;
	user.languages = document.getElementById('languages').value;
	user.endTime = Date.now();

	document.getElementById('submitForm').removeEventListener('click', submitForm);
	document.getElementById('step-form').style.display = 'none';
	submitResults();
}