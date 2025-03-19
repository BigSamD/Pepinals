const { exec } = require('child_process');

// Ottieni il comando dalla riga di comando
const command = process.argv.slice(2).join(' ');

if (!command) {
    console.log('⚠️  Devi fornire un comando da eseguire!');
    process.exit(1);
}

// Funzione per eseguire il comando 10 volte con intervallo di 3 secondi
const executeCommand = () => {
    console.log(`▶️  Inizio esecuzione del comando: "${command}"`);
    let count = 0;

    const interval = setInterval(() => {
        count++;
        console.log(`⚡ [${count}/30] Eseguo: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Errore: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`⚠️  Stderr: ${stderr}`);
                return;
            }
            console.log(`✅ Output: ${stdout}`);
        });

        if (count === 10) {
            clearInterval(interval);
            console.log('⏳ Attesa di 10 secondi prima di ripetere...');
            setTimeout(executeCommand, 10000);
        }
    }, 3000);
};

// Avvia l'esecuzione
executeCommand();
