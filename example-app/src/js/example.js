import { Entrig } from 'entrig-capacitor';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    Entrig.echo({ value: inputValue })
}
