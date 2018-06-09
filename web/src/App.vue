<template>
    <div style="width: 100%; height: 100%; ">
        <div id="container">
            <div class="grid-header" style="margin-bottom: 0.1em;">
                <div style="display: flex; align-items: center; height: 100%;">
                    <h1>[blockflare.]</h1>
                    <div class="space-partners" style="display: flex; flex-direction: row;">
                        <div style="display: flex; flex-direction: column; text-align: left;">
                            <span class="title">Account</span>
                            <span>[{{account && account.owner || 'Loading...'}}]</span>
                        </div>

                        <div style="display: flex; flex-direction: column; text-align: left;">
                            <span class="title">Relay Nodes</span>
                            <span>[{{connected.join(', ')}}]</span>
                        </div>

                        <div style="display: flex; flex-direction: column; text-align: left;">
                            <span class="title">Endpoints</span>
                            <span>[{{endpoints && `${endpoints.length} API route(s) registered.` || 'Loading...'}}]</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid-login" style="width: 1200px; height: 100%;">
                <div style="display: flex; height: 100%; flex-direction: row;">
                    <div style="padding: 2em; width: 350px;">
                        <h2>Please login.</h2>

                        <br/>

                        <div class="form">
                            <input type="text" placeholder="Username." v-model="form.username"/>
                            <input type="password" placeholder="Password." v-model="form.password"/>
                            <input type="button" value="Login" style="width: 108.75%;" @click="relay"
                                   :disabled="mining"/>
                        </div>

                        <br/>

                        <div style="width: 108.75%; height: 150px; background-color: white;">
                            <div style="padding: 2em;">
                                <span style="white-space: pre; font-family: monospace; font-size: 1.25em; font-weight: 600;">{{JSON.stringify(form, null, 4)}}</span>
                            </div>
                        </div>

                        <br/>
                    </div>

                    <div style="padding: 2em;">
                        <div style="height: 150px; background-color: white;">
                            <div style="padding: 1em; width: 100%; height: 150px;">
                                <b style="white-space: pre; font-family: monospace; font-size: 1em; font-weight: 600; overflow-wrap: break-word; word-break: break-all;">{{JSON.stringify(mine,
                                    null, 4)}}</b>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid-log" style="width: 600px;">
                <div style="display: flex; width: 100%; height: 100%; overflow-y: scroll;">
                    <ul class="space-list"
                        style="height: 700px; max-height: 700px; padding: 2em; word-wrap: break-word; overflow-wrap: break-word; overflow: auto;">
                        <li v-for="log in logs">
                            <code style="font-size: 1.5em;">{{log}}</code>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="grid-footer" style="margin-top: 1.25em; height: 80px; padding-left: 2em;">
                <div style="display: flex; align-items: center; height: 100%;">
                    <div class="space-partners" style="display: flex; flex-direction: row;">
                        <div style="display: flex; flex-direction: column; text-align: left;">
                            <span class="title">Relayer Balance</span>
                            <span>[{{account && account.balance || 'Loading...'}} BLR]</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script>
  import Eos from 'eosjs'
  import ecc from 'eosjs-ecc'

  export default {
    name: 'app',
    data() {
      return {
        contract: null,
        logs: [],
        connected: ['localhost:3000', 'localhost:3001', 'localhost:3002'],
        form: {
          username: '',
          password: ''
        },
        mine: {
          difficulty: 1,
          proof_of_work: null,
          nonce: 0
        },
        mining: null,
        awaiting: null,
        account: {},
        endpoints: []
      }
    },
    components: {},
    async mounted() {
      this.eos = Eos({
        keyProvider: ['5Ju8dQQheWe73SMjKG4oaPiVu3AVhyFxsRYHMPVGpeAz1nnw2L6'],
        sign: true,
      })

      this.contract = await this.eos.contract('blockflare')

      setInterval(async () => {
        this.account = (await this.eos.getTableRows(true, 'blockflare', 'blockflare', 'ledger')).rows[0]

        this.endpoints = (await this.eos.getTableRows(true, 'blockflare', 'blockflare', 'endpoints')).rows
      }, 500)

    },
    methods: {
      relay() {
        this.delegateProof(JSON.stringify(this.form))
      },
      generateDifficultyPrefix() {
        let difficultyString = ''
        for (let i = 0; i < this.mine.difficulty; i++) difficultyString += '0'
        return difficultyString
      },
      log(message) {
        if (this.logs.length >= 7)
          this.logs = this.logs.slice(1)
        this.logs.push(`[${new Date().getHours()}:${new Date().getMinutes()} ${new Date().getHours() > 12 ? 'PM' : 'AM'}] ${message}`)
      },
      delegateProof(data) {
        if (!this.mining) {
          const prefix = this.generateDifficultyPrefix()

          let nonce = 0
          let serialized = data + nonce
          let proof_of_work = ecc.sha256(serialized)

          let now = new Date().getTime()

          this.mining = setInterval(async () => {
            if (proof_of_work.slice(0, this.mine.difficulty) !== prefix) {
              nonce = Math.random() * 100000000000
              serialized = data + nonce.toString()
              proof_of_work = ecc.sha256(serialized)
            } else {
              clearInterval(this.mining)

              this.log(`Requesting for login verification w/ proof-of-work "${proof_of_work}" made in ${new Date().getTime() - now}ms...`)

              // TODO: Replace with threshold signature of actual URL.

              let res = await this.contract.request({
                sender: 'blockflare',
                url: 'localhost:9999/login',
                message: data,
                nonce: nonce.toString(),
                proof: proof_of_work
              }, {authorization: ['blockflare']})

              this.log(`Transaction signed and broadcasted on block ${res.transaction.transaction.ref_block_num}.`)

              const relay = 'localhost:3000'

              res = await this.contract.assign({
                relayer: 'blockflare',
                relayAddress: relay
              }, {authorization: ['blockflare']})

              this.log(`Reached relay(s) ${this.connected.join(', ')}. Routing API request...`)

              this.account = (await this.eos.getTableRows(true, 'blockflare', 'blockflare', 'ledger')).rows[0]

              this.awaiting = setInterval(
                async () => {
                  this.log('Awaiting response...')

                  if (this.account) {
                    const tx = (await this.eos.getTableRows(true, 'blockflare', 'blockflare', 'reqrws', 0, this.account.relaying, 1000)).rows.filter(r => r.id === this.account.relaying)[0]
                    if (tx && tx.response.length > 0) {
                      this.log(`Received response from relay node(s) "${tx.sender}": ${tx.response}`)
                      const response = JSON.parse(tx.response)
                      if (response.ok) {
                        this.$swal('Hello!', 'You have successfully logged in!', 'success')
                      } else {
                        this.$swal('Whoops!', response.error, 'error')
                      }
                      clearInterval(this.awaiting)

                      this.awaiting = null
                      this.mining = null
                    }
                  }
                }, 250
              )
            }

            this.mine.proof_of_work = proof_of_work
            this.mine.serialized = serialized
            this.mine.nonce = nonce.toString()
          }, 15)

        }
      }
    }
  }
</script>

<style>
    html {
        width: 100%;
        height: 100%;
    }

    * {
        margin: 0;
        padding: 0;
    }

    body {
        width: 100%;
        height: 100%;

        font-family: 'monospace', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;

        color: #2c3e50;
    }

    #container {
        display: grid;
        grid-template-areas: 'header header header header header header' 'login login login login log log' 'login login login login log log' 'login login login login log log' 'login login login login log log' 'login login login login log log' 'login login login login log log' 'login login login login log log' 'login login login login log log' 'footer footer footer footer footer footer' 'footer footer footer footer footer footer';
    }

    #container > div {
        background-color: #eaeaea;
        margin: 0.5em;
    }

    .grid-header {
        grid-area: header;
        text-align: center;
        padding-left: 1em;
        background-color: white !important;
    }

    .grid-login {
        grid-area: login;
        height: 100%;
    }

    .grid-log {
        grid-area: log;
        height: 100%;
        background-color: black !important;
        color: lightgreen;
    }

    .grid-footer {
        grid-area: footer;
    }

    #container {
        width: 100%;
        height: 100%;
    }

    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        margin-bottom: 0.5em;
    }

    a {
        color: #42b983;
    }

    code {
        font-size: 2em;
    }

    h1 {
        font-size: 3em;
        margin-right: 1em;
    }

    input {
        padding: 0.5em;
        font-size: 2em;
        font-family: monospace;
        width: 100%;
    }

    .form {
        display: flex;
        flex-direction: column;

    }

    .form > :not(:last-child) {
        margin-bottom: 0.5em;
    }

    .space-partners > :not(:last-child) {
        margin-right: 3em;
    }

    .title {
        font-weight: 600;
        font-size: 1.5em;
    }

    .space-list > :not(:last-child) {
        margin-bottom: 1.25em;
    }
</style>
