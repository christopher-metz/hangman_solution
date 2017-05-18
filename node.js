const axios = require('axios')
const fs = require('fs')

const Node = function (letter) {
  this.letter = letter
  this.children = []
  this.parent = null
}

Node.prototype.addChild = function (childNode) {
  childNode.parent = this
  this.children.push(childNode)
}

Node.prototype.childExists = function (target) {
  for (const each of this.children) {
    if (each.letter === target) {
      return true
    }
  }
  return false
}

Node.prototype.getChild = function (target) {
  for (const each of this.children) {
    if (each.letter === target) {
      return each
    }
  }
  return false
}

Node.prototype.deleteChildNode = function (childLetter) {
  return this.children.filter((node) => {
    return node.letter !== childLetter
  })
}

Node.prototype.deleteSiblings = function () {
  const newChildren = this.parent.children.filter((child) => {
    return child.letter === this.letter
  })
  this.parent.children = newChildren
}

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

function createInitialTree (target, words, token) {
  const filtered = words.filter((word) => {
    return word.length === target.length
  })
  const wordTree = new Node('*')
  for (const each of filtered) {
    let curNode = wordTree
    for (let i = 0; i < each.length; i++) {
      if (!curNode.childExists(each[i].toLowerCase())) {
        const newChild = new Node(each[i].toLowerCase())
        curNode.addChild(newChild)
      }
      curNode = curNode.getChild(each[i].toLowerCase())
    }
  }
  return wordTree
}

const createGame = function (callback) {
  let hangman = ''
  let token = ''

  axios.post('http://hangman-api.herokuapp.com/hangman')
    .then((response) => {
      hangman = response.data.hangman
      token = response.data.token
      return getWords()
    })
    .then((content) => {
      const words = content.split('\n')
      let wordTree = createInitialTree(hangman, words, token)
      const res = {hangman, token, wordTree}
      return callback(res, false)
    })
    .catch((err) => {
      const error = err
      return callback({}, error)
    })
}

module.exports = {Node, createGame}
