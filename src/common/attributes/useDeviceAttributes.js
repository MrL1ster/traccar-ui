import { useMemo } from 'react';

export default (t) =>
  useMemo(
    () => ({
      'command.sender': {
        name: t('deviceCommandSender'),
        type: 'string',
      },
      'web.reportColor': {
        name: t('attributeWebReportColor'),
        type: 'string',
        dataType: 'color',
      },
      devicePassword: {
        name: t('attributeDevicePassword'),
        type: 'string',
      },
      deviceImage: {
        name: t('attributeDeviceImage'),
        type: 'string',
      },
      deviceIcon: {
        name: t('attributeDeviceIcon') || 'Icon',
        type: 'string',
        options: [
          { key: 'iphone', name: t('iconIphone') || 'iPhones' },
          { key: 'ipad', name: t('iconIpad') || 'iPads' },
          { key: 'car', name: t('iconCar') || 'Car' },
          { key: 'tradieUte', name: t('iconTradieUte') || 'Tradie Ute with canopy' },
          { key: 'ewp', name: t('iconEwp') || 'EWP' },
          { key: 'trailer', name: t('iconTrailer') || 'Trailer' },
          { key: 'machinery', name: t('iconMachinery') || 'Machinery' },
          { key: 'testEquipment', name: t('iconTestEquipment') || 'Test Equipment' },
        ],
      },
      'processing.copyAttributes': {
        name: t('attributeProcessingCopyAttributes'),
        type: 'string',
      },
      'decoder.timezone': {
        name: t('sharedTimezone'),
        type: 'string',
      },
      'forward.url': {
        name: t('attributeForwardUrl'),
        type: 'string',
      },
    }),
    [t],
  );
