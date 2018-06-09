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

while (hash[0] !== '0') {
  data.nonce = Math.random() * 100000000000
  serialized = JSON.stringify(data)
  hash = ecc.sha256(serialized)
}

console.log(hash)