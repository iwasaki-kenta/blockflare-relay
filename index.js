import ecc from 'eosjs-ecc'

const data = {
  request: {
    code: "GET",
    username: "Hi",
    password: "secretpassword"
  },
  nonce: 0
}

let serialized = JSON.stringify(data)
let hash = ecc.sha256(serialized)

const difficulty = 4

let difficultyString = ""
for (let i = 0; i < difficulty; i++) difficultyString += "0"

while (hash.slice(0, difficulty) !== difficultyString) {
  data.nonce = Math.random() * 100000000000
  serialized = JSON.stringify(data)
  hash = ecc.sha256(serialized)
}

console.log(hash)