const axios = require('axios')
const fs = require('fs')
const {Node, createGame} = require('./node')
const qs = require('querystring')
let wins = 0
let games = 0

function sumLetters (wordTree, topGuesses) {
  if (wordTree.children.length === 0) {
    let curParent = wordTree
    while (curParent.parent) {
      if (!topGuesses[curParent.letter]) {
        topGuesses[curParent.letter] = 1
      } else {
        topGuesses[curParent.letter] += 1
      }
      curParent = curParent.parent
    }
    return topGuesses
  }
  for (const child of wordTree.children) {
    sumLetters(child, topGuesses)
  }
  return topGuesses
}

function createGuess (wordTree, guesses) {
  const topGuesses = sumLetters(wordTree, {})
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

function createBadGuessTree (guess, wordTree) {
  let nodes = []

  nodes.push(wordTree)
  while (nodes.length > 0) {
    let current = nodes.shift()

    if (current.letter === guess) {
      current.parent.children = current.parent.deleteChildNode(current.letter)
    }

    if (current.children.length) {
      for (const child of current.children) {
        nodes.push(child)
      }
    }
  }

  return wordTree
}

function createGoodGuessTree (guess, target, wordTree) {
  const indexes = []
  let nodes = []
  for (let i = 0; i < target.length; i++) {
    if (target[i].toLowerCase() === guess) {
      indexes.push(i)
    }
  }

  nodes.push(wordTree)
  while (nodes.length > 0) {
    let current = nodes.shift()
    let parents = 0
    let curParent = current
    while (curParent.parent) {
      parents++
      curParent = curParent.parent
    }

    if (current.letter === guess) {
      if (indexes.indexOf(parents - 1) === -1) {
        current.parent.children = current.parent.deleteChildNode(current.letter)
      } else {
        current.deleteSiblings()
      }
    } else if (indexes.indexOf(parents - 1) !== -1) {
      current.parent.children = current.parent.deleteChildNode(current.letter)
    }

    if (current.children.length) {
      for (const child of current.children) {
        nodes.push(child)
      }
    }
  }

  return wordTree
}

function cleanTree (target, wordTree, changes) {
  let nodes = []

  nodes.push(wordTree)
  while (nodes.length > 0) {
    let current = nodes.shift()
    let parents = 0
    let curParent = current
    while (curParent.parent) {
      parents++
      curParent = curParent.parent
    }

    if (current.children.length > 0) {
      for (const child of current.children) {
        nodes.push(child)
      }
    } else if (parents < target.length) {
      changes++
      current.parent.children = current.parent.deleteChildNode(current.letter)
    }
  }

  if (changes === 0) {
    return wordTree
  } else {
    return cleanTree(target, wordTree, 0)
  }
}

function replacer (key, value) {
  if (key === 'parent' && value) {
    return value.letter
  }

  return value
}

function saveTree (wordTree) {
  const tree = JSON.stringify(wordTree, replacer, ' ')
  return new Promise((resolve, reject) => {
    fs.writeFile('wordTree.txt', tree, (err) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}

function solveGame (hangman, token, wordTree, guesses, wrongGuesses) {
  if (hangman.indexOf('_') === -1 || wrongGuesses === 6) {
    if (wrongGuesses === 6) {
      axios({
        method: 'get',
        url: 'http://hangman-api.herokuapp.com/hangman',
        params: {
          token: token
        }
      })
      .then((response) => {
        games++
        console.log('Game Over:', hangman)
        console.log(response.data.solution)
        console.log((wins / games) * 100)
      })
      .catch((err) => {
        console.log(err)
      })
      startGame()
    } else {
      console.log('You Win:', hangman)
      wins++
      games++
      console.log((wins / games) * 100)
      startGame()
    }
    return
  }

  const body = ['o', 'o/', 'o<', 'o<-', 'o<-/', 'o<-<']
  const guess = createGuess(wordTree, guesses)

  axios({
    method: 'put',
    url: 'http://hangman-api.herokuapp.com/hangman',
    data: qs.stringify({
      token: token,
      letter: guess
    })
  })
  .then((response) => {
    hangman = response.data.hangman
    token = response.data.token
    if (response.data.correct) {
      wordTree = createGoodGuessTree(guess, hangman, wordTree)
      console.log('Guess:', guess, 'Word:', hangman)
    } else {
      wordTree = createBadGuessTree(guess, wordTree)
      wrongGuesses++
      console.log('Guess:', guess, 'Hangman:', body[wrongGuesses - 1])
    }
    guesses.push(guess)
    wordTree = cleanTree(hangman, wordTree, 0)
    saveTree(wordTree).then(() => {
      solveGame(hangman, token, wordTree, guesses, wrongGuesses)
    }).catch((err) => {
      console.log(err)
    })
  })
  .catch((err) => {
    console.log(err)
  })
}

function getGame () {
  return new Promise((resolve, reject) => {
    createGame((res, err) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}

function startGame () {
  getGame().then((content) => {
    const {hangman, token, wordTree} = content
    solveGame(hangman, token, wordTree, [], 0)
  }).catch((err) => {
    console.log('it failed', err)
  })
}

startGame()
