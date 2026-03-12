import https from 'https';

https.get('https://api.511.org/transit/VehicleMonitoring?api_key=e7118522-dfbd-4d83-8a3e-b86a87d71626&agency=SF', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(JSON.stringify(json.Siri.ServiceDelivery.VehicleMonitoringDelivery.VehicleActivity[0], null, 2));
  });
});
