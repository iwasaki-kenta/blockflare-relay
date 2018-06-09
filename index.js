import ecc from 'eosjs-ecc'
import Eos from 'eosjs'

const eos = Eos({
  keyProvider: ['5Ju8dQQheWe73SMjKG4oaPiVu3AVhyFxsRYHMPVGpeAz1nnw2L6'],
  sign: true,
})

class Relayer {
  difficulty = 4

  constructor() {
  }

  generateDifficultyPrefix() {
    let difficultyString = ''
    for (let i = 0; i < this.difficulty; i++) difficultyString += '0'
    return difficultyString
  }

  delegateProof(data) {
    const prefix = this.generateDifficultyPrefix()

    let nonce = 0
    let serialized = data + nonce
    let hash = ecc.sha256(serialized)

    while (hash.slice(0, this.difficulty) !== prefix) {
      nonce = Math.random() * 100000000000
      serialized = data + nonce.toString()
      hash = ecc.sha256(serialized)
    }

    return {hash, nonce: nonce.toString()}
  }
}

(async () => {
  const data = 'this_is_test_data'

  const relayer = new Relayer()
  const before = new Date().getTime()

  const proof = relayer.delegateProof(data)

  const contract = await eos.contract('blockflare')

  setInterval(async () => {
    const accountIndex = 0;
    const account = (await eos.getTableRows(true, 'blockflare', 'blockflare', 'ledger')).rows[accountIndex]
    console.log(`Your account: ${account.owner}`);

    const relay = (await eos.getTableRows(true, 'blockflare', 'blockflare', 'reque', 0, account.relaying, 1000)).rows.filter(r => r.id === account.relaying)[0]
    if (relay) {
      await contract.respond({relayer: "blockflare", response: "It's a response!"}, {authorization: ['blockflare']})

      console.log(`Routed tx. ID ${relay.id} through your host ${account.relayAddress} to API located at "${relay.url}" w/ neighbouring nodes: [${relay.relayers.join(", ")}].`)
    }
    console.log()
  }, 1000)

  // let res
  //
  // try {
  //   res = await contract.newendpoint({creator: 'blockflare', url: 'google.com'}, {authorization: ['blockflare']})
  // } catch (error) {
  //   res = await contract.delendpoint({url: 'google.com'}, {authorization: ['blockflare']})
  //   res = await contract.newendpoint({creator: 'blockflare', url: 'google.com'}, {authorization: ['blockflare']})
  //
  // }
  //
  // try {
  //   res = await contract.request({
  //     sender: 'blockflare',
  //     url: 'google.com',
  //     message: data,
  //     nonce: proof.nonce,
  //     proof: proof.hash
  //   }, {authorization: ['blockflare']})
  //   console.log(res)
  // } catch (error) {
  //   console.log(error)
  // }
  //
  // try {
  //   res = await contract.delendpoint({url: 'google.com'}, {authorization: ['blockflare']})
  // } catch (error) {}
  //
  // console.log(await eos.getKeyAccounts("EOS5cm3H9RX5F1ENbhch6rBnjGeVPb6VYF8VktYJcsxFzVRBfQS5P"))

// eos.getTableRows(true, 'blockflare', 'blockflare', 'relayers', 0, 0, 1000).then(data => console.log(data))
})()
