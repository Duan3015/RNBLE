/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
} from 'react-native';

import {Observable} from 'rxjs';

import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from 'react-native-ble-plx';
import {startScan} from './ble-service';

const App: () => React$Node = () => {
  const bleManager = new BleManager();

  const zlib = require('react-zlib-js');

  const [responseOffer, setResponse] = useState('');

  // console.log(bleManager);

  const startScan = async () => {
    try {
      return await bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log(JSON.stringify(error));
          return;
        }

        if (device === null) {
          return;
        }

        if (device === null && device.localName.includes(0, 'TGP_PYTURISMO')) {
          return;
        }

        bleManager.stopDeviceScan();
        connectToDevice(device);
      });
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const connectToDevice = async device => {
    const deviceId = device.id;
    const serviceUUIDs = device.serviceUUIDs;
    await bleManager.connectToDevice(deviceId);
    console.log('Conectado...');
    await bleManager.discoverAllServicesAndCharacteristicsForDevice(deviceId);
    discoverAllCharacteristic(deviceId, serviceUUIDs);
  };

  const getNotifyCharacteristic = notifiableCh => {
    let responsePartsCount = 0;
    let responsesReceived = 0;
    let responseTotal = '';

    let notificationValue = '';

    notifiableCh.monitor(async (error, characteristic) => {
      console.log('Monitor');

      if (error) {
        console.log(error);
        return;
      }

      if (characteristic === undefined || characteristic === null) {
        return;
      }

      console.log(atob(characteristic.value));

      if (responsePartsCount === 0) {
        notificationValue = atob(characteristic.value);
        notificationValue = notificationValue.replace('np=', '');
        responsePartsCount = Number(notificationValue);
      } else {
        notificationValue = atob(characteristic.value);
        notificationValue = notificationValue.substring(1);
        responseTotal = responseTotal + notificationValue;
        responsesReceived++;
      }
      if (responsesReceived === responsePartsCount) {
        decompressData(btoa(responseTotal));
      }
    });
  };

  // const getWriteCharacteristic = async writableCh => {
  //   //await writableCh.writeWithoutResponse(btoa('Pass=pYtuR1sM0!!2o2I'));
  //   await writableCh.writeWithoutResponse(btoa('np=1'));
  //   console.log('Done');

  //   await writableCh.writeWithResponse(
  //     btoa('1{"http":{"MET":"LOCAL","URL":"index"},"Body":{}}\n'),
  //   );
  //   console.log('Done');
  // };

  const getIdTGP = async readableCh => {
    try {
      return await readableCh.read();
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const discoverAllCharacteristic = async (deviceId, serviceUUIDs) => {
    const characteristics = await bleManager.characteristicsForDevice(
      deviceId,
      serviceUUIDs[0],
    );
    let notifiableCh = null;
    let writableCh = null;
    let readableCh = null;
    let idTGP = '';

    characteristics.forEach(characteristic => {
      if (characteristic.isNotifiable) {
        notifiableCh = characteristic;
        console.log('conectado al notify');
      }

      if (characteristic.isWritableWithResponse) {
        writableCh = characteristic;
        console.log('conectado al write');
      }

      if (characteristic.isReadable) {
        readableCh = characteristic;
        console.log('conectado al readable');
      }
    });
    // idTGP = await getIdTGP(readableCh).then(response => {
    //   return response.value;
    // });
    // console.log(atob(idTGP));
    sendPass(characteristics);
    await sendInfo(characteristics);
    sendIndex(characteristics);
    // getWriteCharacteristic(writableCh);
    getNotifyCharacteristic(notifiableCh);
  };

  const decompressData = data => {
    const Buffer = require('buffer/').Buffer;
    console.log(data);
    const buffer = Buffer.from(data, 'base64');
    console.log(buffer);
    let notificationValueDecompress;
    zlib.unzip(buffer, (err, buffer) => {
      console.log('tercero se ejecuta');
      if (!err) {
        notificationValueDecompress = buffer.toString();
        console.log(notificationValueDecompress);
      } else {
        console.log(err);
      }
    });
    return notificationValueDecompress;
  };

  const getDataOffers = () => {
    const bleManager = new BleManager();
    console.log(startScan(bleManager));
  };

  const sendPass = async characteristic => {
    try {
      const pass = 'Pass=pYtuR1sM0!!2o2I';
      let writebleCh = null;
      writebleCh = characteristic.find(
        item => item.isWritableWithoutResponse === true,
      );
      await writebleCh.writeWithoutResponse(btoa(pass) + '\n');
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const sendInfo = async characteristic => {
    try {
      let writebleCh = null;
      let readableCh = null;
      let idTGP = null;
      let mess = '';

      readableCh = characteristic.find(item => item.isReadable === true);

      idTGP = await getIdTGP(readableCh).then(response => {
        return response.value;
      });
      writebleCh = characteristic.find(
        item => item.isWritableWithoutResponse === true,
      );
      // console.log(readableCh);
      mess =
        '1{"http":{"MET": "POST","URL":"http://35.229.26.208:8871/tepinteractions"},"Body":{"id_tgp":"' +
        atob(idTGP) +
        '", "id_tur": 1, "coor":"3.408975, -76.547253","fecha_con":"2021-01-20T14:00"}}\n';
      // console.log(mess);
      await writebleCh.writeWithoutResponse(btoa('np=1'));
      await writebleCh.writeWithoutResponse(btoa(mess));
    } catch (error) {}
  };

  const sendIndex = async characteristic => {
    try {
      let writebleCh = null;
      let readableCh = null;
      let mess = null;
      writebleCh = characteristic.find(
        item => item.isWritableWithoutResponse === true,
      );
      // console.log(readableCh);
      mess =
        '1{"http":{"MET":"LOCAL","URL":"OfyEv"},"Body": { "ofertas": "26", "eventos": "12"}}\n';
      // console.log(mess);
      await writebleCh.writeWithoutResponse(btoa('np=1'));
      await writebleCh.writeWithoutResponse(btoa(mess));
    } catch (error) {}
  };
  const getWriteCharacteristic = async characteristic => {
    try {
      return await characteristic.find(
        item => item.isWritableWithoutResponse === true,
      );
    } catch (error) {
      throw new Error(error.message);
    }
  };

  startScan();

  // const device = null;
  //   const nameTGP = 'TGP_PYTURISMO';
  //   device = await bleManager.startDeviceScan(null, null, (error, device) => {
  //     if (error) {ñ
  //       console.log(JSON.stringify(error));
  //       return;
  //     }

  //     if (device === null) {
  //       return;
  //     }

  //     if (device.localName.includes(0, nameTGP)) {
  //       return;
  //     }

  //     bleManager.stopDeviceScan();
  //   });
  //   return device;

  // getDataOffers();

  // zlib.unzip(buffer, (err, buffer) => {
  //   console.log('tercero se ejecuta');
  //   if (!err) {
  //     console.log('cuarto en ejecutarse');
  //     notificationValue = buffer.toString();
  //     responseTotal =
  //       responseTotal + notificationValue.replace(/(\r\n|\n|\r)/gm, '');
  //     responsesReceived++;
  //     if (responsesReceived === responsePartsCount) {
  //       console.log('quinto en ejecutarse');
  //       setResponse(responseTotal);
  //       return Promise.resolve(responseTotal);
  //     } else {
  //       console.log('aun no esta todo el mensaje');
  //     }
  //   } else {
  //     console.log(err);
  //   }
  // });

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <Text>Hola</Text>
          <Text>{responseOffer}</Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default App;
