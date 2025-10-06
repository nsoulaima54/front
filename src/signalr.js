import * as signalR from "@microsoft/signalr";

export const hubConnection = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5167/alertHub") // 👈 your backend hub URL
    .withAutomaticReconnect()
    .build();

export const startConnection = async () => {
    try {
        await hubConnection.start();
        console.log("SignalR connected");
    } catch (err) {
        console.error("SignalR connection error:", err);
        setTimeout(startConnection, 5000); // retry
    }
};
