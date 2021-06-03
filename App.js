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

  // const bleManager = new BleManager();

  const zlib = require('react-zlib-js');

  const [responseOffer, setResponse] = useState('');

  // console.log(bleManager);

  const startScan = async bleManager => {
    try {
      return await bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log(JSON.stringify(error));
          return;
        }

        if (device === null) {
          return;
        }

        if (device.localName.includes(0, 'TGP_PYTURISMO')) {
          return;
        }

        bleManager.stopDeviceScan();
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

    let notificationValue = 'Tengo miedo';

    const subscription = notifiableCh.monitor(async (error, characteristic) => {
      console.log('Monitor');

      if (error) {
        console.log(error);
        return;
      }

      if (characteristic === undefined || characteristic === null) {
        return;
      }

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
        console.log(
          decompressData(btoa(responseTotal)).replace(/(\r\n|\n|\r)/gm, ''),
        );
      }
    });
    console.log('Subscription', subscription);
  };

  const getWriteCharacteristic = async writableCh => {
    await writableCh.writeWithoutResponse(btoa('Pass=pYtuR1sM0!!2o2I'));
    await writableCh.writeWithoutResponse(btoa('np=1'));
    console.log('Done');

    await writableCh.writeWithResponse(
      btoa(
        '1{"http":{"MET":"LOCAL","URL":"OfyEv"},"Body": { "ofertas": "205", "eventos": ""}}\n',
      ),
    );
    console.log('Done');
  };

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
    let IdTGP = '';

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
    IdTGP = await getIdTGP(readableCh).then(response => {
      return response.value;
    });
    console.log(atob(IdTGP));
    getWriteCharacteristic(writableCh);
    const result = await getNotifyCharacteristic(notifiableCh);
    console.log('getNotifyCharacteristic', result);
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

  // const device = null;
  //   const nameTGP = 'TGP_PYTURISMO';
  //   device = await bleManager.startDeviceScan(null, null, (error, device) => {
  //     if (error) {
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

  getDataOffers();

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
