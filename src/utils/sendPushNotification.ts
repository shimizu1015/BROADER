
//プッシュ通知送信の関数
export async function sendPushNotification(expoPushToken: string,pushBody: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: "BROADER",
    body: pushBody,
    data: { someData: 'goes here' },
  };
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}