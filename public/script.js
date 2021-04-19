'use strict';
let wordElement;

function keyup(e){
	switch (e.key) {
		case '1':
		case '2':
		case '3':
		case '4':
			trackWord(parseInt(e.key));
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

function next(){
	progressSlide();
}

function answerClick(e) {
	const key = parseInt(e.target.getAttribute('data-key'));
	console.log('answerClick', e, key);
	if (isNaN(key)) {
		// could be click on margin or whatever
		return;
	}
	trackWord(key);
}

document.addEventListener('DOMContentLoaded', function () {
	document.body.addEventListener('keyup', keyup);
	document.getElementById('submitForm').addEventListener('click', submitForm);
	document.getElementById('step-one').style.display = 'flex';
	wordElement = document.getElementById('answers');
	wordElement.addEventListener('click', answerClick);
});

let item;
let itemIndex = -1;
let isPractice = true;
let state = 'start';
let results = [];
let bank = [];
let user = {};

function runPractice(){
	user.practiceStart = Date.now();
	bank = window.bank.practice;
	shuffleArray(bank);
	itemIndex = 0;
	runNextWord();
}

function runExperiment(){
	user.experimentStart = Date.now();
	bank = window.bank.main;
	shuffleArray(bank);
	itemIndex = 0;
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
	item = bank[itemIndex];
	wordElement.innerHTML = '';

	setTimeout(function(){
		let result = {
			...item,
			onsetTime: Date.now(),
			isPrac: isPractice
		};

		results.push(result);

		let audioElement = document.getElementById('audio');
		audioElement.src = item.soundFile;
		audioElement.onplaying = () => {
			result.audioStart = Date.now();
		};
		audioElement.onended = () => {
			result.audioEnd = Date.now();
			wordElement.innerHTML = item.answers.map(answer => `<li data-key="${answer.key}">${answer.symbol}</li>`).join('');
		};
		audioElement.play().catch(console.error);
	}, 500);
}

function trackWord(response) {
	if (!item) return;
	let result = results[results.length - 1];
	result.responseTime = Date.now();
	result.reaction = result.responseTime - result.audioEnd;
	result.response = response;
	result.accuracy = result.response === result.answer;

	itemIndex++;
	item = null;

	if (!bank[itemIndex]) {
		displayFinish();
	} else if (itemIndex > 25 && itemIndex < bank.length - 25 && itemIndex % 25 === 1) {
		displayPause();
	} else {
		if (isPractice && result.accuracy)
			wordElement.innerHTML = '<img src="correct.png" />';
		else if (isPractice && !result.accuracy)
			wordElement.innerHTML = '<img src="incorrect.png" />';
		else
			wordElement.innerHTML = '';
		setTimeout(function(){
			runNextWord();
		}, 1500);
	}
}

function displayPause() {
	document.getElementById('word-container').style.display = 'none';
	document.getElementById('step-pause').style.display = 'flex';
	state = 'pause';
}

function displayFinish() {
	document.getElementById('word-container').style.display = 'none';
	if (isPractice) {
		document.getElementById('step-four').style.display = 'flex';
		isPractice = false;
		state = 'four';
	} else {
		document.getElementById('step-form').style.display = 'flex';
		state = 'finish';
	}
}

function progressSlide() {
	switch(state) {
		case 'start':
			document.getElementById('step-one').style.display = 'none';
			document.getElementById('step-two').style.display = 'flex';
			state = 'two';
			break;
		case 'two':
			document.getElementById('step-two').style.display = 'none';
			document.getElementById('step-form').style.display = 'flex';
			state = 'form';
			break;
		case 'form':
			document.getElementById('step-form').style.display = 'none';
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
function submitResults() {
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

function submitForm() {
	if (submitAttempts > 0) return; // just in case lag or something makes it come here again

	let handedness = document.getElementById("handedness");
	if (!document.getElementById('age').value
		|| !document.getElementById('languages').value || document.getElementById('handedness').selectedIndex === 0) {
		alert('Please fill in all the form fields.');
		return;
	}

	let questionnaire = document.getElementById('questionnaire');
	const formData = new FormData(questionnaire);
	for (const pair of formData.entries()) {
		user[pair[0]] = pair[1];
	}

	user.formSubmitTime = Date.now();

	document.getElementById('submitForm').removeEventListener('click', submitForm);
	document.getElementById('step-form').style.display = 'none';
	progressSlide();
}