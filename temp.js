const axios = require('axios')
const fs = require('fs')
let wins = 0
let games = 0

function getWords () {
  return new Promise((resolve, reject) => {
    fs.readFile('./words', 'utf8', (err, content) => {
      if (err) {
        return reject(err)
      }

      resolve(content)
    })
  })
}

function createInitialList (target, words) {
  return words.filter((word) => {
    return word.length === target.length
  })
}

function createBadGuessList (guess, words) {
  return words.filter((word) => {
    return word.indexOf(guess) === -1
  })
}

function createGoodGuessList (target, words) {
  return words.filter((word) => {
    let bool = true
    for (let i = 0; i < word.length; i++) {
      if (target[i] !== '_') {
        if (target[i] !== word[i]) {
          bool = false
        }
      }
    }
    return bool
  })
}

function createGuess (words, guesses) {
  const topGuesses = {}
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      if (!topGuesses[word[i].toLowerCase()]) {
        topGuesses[word[i].toLowerCase()] = 1
      } else {
        topGuesses[word[i].toLowerCase()] += 1
      }
    }
  }
  let maxNum = 0
  let maxLetter
  for (const each of Object.keys(topGuesses)) {
    if (topGuesses[each] > maxNum && guesses.indexOf(each) === -1) {
      maxNum = topGuesses[each]
      maxLetter = each
    }
  }
  return maxLetter
}

function solveGame (word, token, filteredWords, guesses, wrongGuesses) {
  if (word.indexOf('_') === -1 || wrongGuesses === 6) {
    if (wrongGuesses === 6) {
      axios({
        method: 'get',
        url: 'http://hangman-api.herokuapp.com/hangman',
        params: {
          token: token
        }
      })
      .then((response) => {
        console.log('Game Over:', word)
        console.log(response.data.solution)
        console.log((wins / games) * 100)
        games++
      })
      .catch((err) => {
        console.log(err)
      })
      createGame()
    } else {
      console.log('You Win:', word)
      console.log((wins / games) * 100)
      wins++
      games++
      createGame()
    }
    return
  }

  const body = ['o', 'o/', 'o<', 'o<-', 'o<-/', 'o<-<']
  const guess = createGuess(filteredWords, guesses)

  axios({
    method: 'put',
    url: 'http://hangman-api.herokuapp.com/hangman',
    params: {
      token: token,
      letter: guess
    }
  })
  .then((response) => {
    word = response.data.hangman
    token = response.data.token
    if (response.data.correct) {
      filteredWords = createGoodGuessList(word, filteredWords)
      console.log('Guess:', guess, 'Word:', word)
    } else {
      filteredWords = createBadGuessList(guess, filteredWords)
      wrongGuesses++
      console.log('Guess:', guess, 'Hangman:', body[wrongGuesses - 1])
    }
    guesses.push(guess)
    solveGame(word, token, filteredWords, guesses, wrongGuesses)
  })
  .catch((err) => {
    console.log(err)
  })
}

function createGame () {
  axios.post('http://hangman-api.herokuapp.com/hangman')
    .then((response) => {
      getWords().then((content) => {
        const words = content.split('\n')
        const filteredWords = createInitialList(response.data.hangman, words)
        solveGame(response.data.hangman, response.data.token, filteredWords, [], 0)
      }).catch((err) => {
        console.log(err)
      })
    })
    .catch((err) => {
      console.log(err)
    })
}

createGame()
