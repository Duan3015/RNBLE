import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from 'react-native-ble-plx';

const bleManager = new BleManager();
const Buffer = require('buffer/').Buffer;
const zlib = require('react-zlib-js');

const startScan = () => {
  let responseTotal = '';
  bleManager.startDeviceScan(null, null, (error: BleError, device) => {
    if (error) {
      console.log(JSON.stringify(error));
    }

    if (device !== null) {
      console.log(device.localName);
      if (device.localName === 'TGP_PYTURISMO_') {
        const deviceId = device.id;
        const serviceUUIDs = device.serviceUUIDs;
        bleManager.stopDeviceScan();
        bleManager
          .connectToDevice(deviceId)
          .then(() => {
            console.log('Conectado...');
            console.log(device);

            bleManager
              .discoverAllServicesAndCharacteristicsForDevice(deviceId)
              .then((result: any) => {
                bleManager
                  .characteristicsForDevice(deviceId, serviceUUIDs[0])
                  .then((characteristics: Characteristic[]) => {
                    let notifiableCh = null;
                    let writableCh = null;

                    characteristics.forEach(
                      (characteristic: Characteristic) => {
                        if (characteristic.isNotifiable) {
                          notifiableCh = characteristic;
                        }

                        if (characteristic.isWritableWithoutResponse) {
                          writableCh = characteristic;
                        }
                      },
                    );



                    let responsePartsCount = 0;

                    let responsesReceived = 0;

                    notifiableCh.monitor((error, characteristic) => {
                      console.log('Monitor');
                      if (error) {
                        console.log(error);
                      }

                      if (characteristic) {
                        let notificationValue = atob(characteristic.value);
                        if (responsePartsCount === 0) {
                          notificationValue = notificationValue.replace(
                            'np=',
                            '',
                          );
                          responsePartsCount = Number(notificationValue);
                          console.log(responsePartsCount);
                        } else {
                          const buffer = Buffer.from(
                            notificationValue,
                            'base64',
                          );
                          console.log('segunda se ejecuta');
                          zlib.unzip(buffer, (err, buffer) => {
                            console.log('tercero se ejecuta');
                            if (!err) {
                              console.log('cuarto en ejecutarse');
                              notificationValue = buffer.toString();
                              console.log(notificationValue);
                              responseTotal =
                                responseTotal +
                                notificationValue.replace(/(\r\n|\n|\r)/gm, '');
                              responsesReceived++;
                              console.log(responseTotal);
                              if (responsesReceived === responsePartsCount) {
                                console.log('quinto en ejecutarse');
                              } else {
                                console.log('aun no esta todo el mensaje');
                              }
                            } else {
                              console.log(err);
                            }
                          });
                        }
                      }
                    });

                    writableCh.writeWithoutResponse(btoa('np=1')).then(() => {
                      console.log('Done');
                    });
                    writableCh
                      .writeWithResponse(
                        btoa(
                          '1{"http":{"MET": "POST","URL":"35.229.26.208:8871/tepinteractions"},"Body"{"id_tgp":"1", "id_tur":"1","coor":"3.408975,-76.547253","fecha_con":"2021-01-20T14:00"}}\n',
                        ),
                      )
                      .then(() => {
                        console.log('Done');
                      });
                  });
              });
          })
          .catch((error: any) => {
            console.error(error);
          });
      }
    }
  });
  console.log('tengo miedo');
  console.log(responseTotal);
  //console.log(responseTotal);
};

export {startScan};
