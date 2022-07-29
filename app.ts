import { connect } from 'imap-simple';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { TIME_TO_LETTERS } from './config';

class Account {
    user: string;
    password: string;

    constructor({user, password}: Partial<Account>) {
        this.user = user;
        this.password = password;
    }
}

class EmailConfig extends Account {
    host = 'mail1.tuthost.com';
    port = 993;
    tls = true;
    authTimeout = 3000;

    constructor({user, password}: Partial<EmailConfig>) {
        super({user, password})
    }
}


function getConfigEmail(account: Account) {
    return new EmailConfig(account)
}

async function getAccountsData(): Promise<Account[]> {
    let accountData = [];
    return new Promise((resolve, reject) => {
        createReadStream('accounts.csv')
            .pipe(parse({delimiter: ','}))
            .on('data', (row) => {
                accountData.push(new Account({user: row[0], password: row[1]}));
            })
            .on('end', () => {
                resolve(accountData);
            });
    });
}

(async function main() {
    const accountsData = await getAccountsData();
    const searchCriteria = ['ALL'];
    const fetchOptions = {bodies: ['HEADER'], struct: true};

    for (let data of accountsData) {
        const connection = await connect({imap: getConfigEmail(data)});

        await connection.openBox('INBOX');
        const messages = (await connection.search(searchCriteria, fetchOptions)).reverse();

        for (let message of messages) {
            if (
                +message.attributes.date >= +new Date() - TIME_TO_LETTERS &&
                message.parts[0].body.subject[0] === "[Binance NFT] NFT distribution has ended"
            ) {
                console.log(data.user, data.password)
            }
        }
    }
    process.exit();
})()
