import { useCallback, useEffect, useReducer } from 'react';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { List } from 'react-window';
import { devicesActions } from '../store';
import { useAsyncTask } from '../reactHelper';
import DeviceRow, { shouldShowGroupDivider } from './DeviceRow';
import fetchOrThrow from '../common/util/fetchOrThrow';

const BASE_ROW_HEIGHT = 48;
const DIVIDER_EXTRA_HEIGHT = 9;

const useStyles = makeStyles()((theme) => ({
  list: {
    height: '100%',
    width: '100%',
    direction: theme.direction,
  },
  listInner: {
    position: 'relative',
    margin: theme.spacing(1.5, 0),
  },
}));

const DeviceList = ({ devices }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const interval = setInterval(forceUpdate, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useAsyncTask(
    async ({ signal }) => {
      const response = await fetchOrThrow('/api/devices', { signal });
      dispatch(devicesActions.refresh(await response.json()));
    },
    [dispatch],
  );

  const getRowHeight = useCallback(
    (index) =>
      shouldShowGroupDivider(devices, index)
        ? BASE_ROW_HEIGHT + DIVIDER_EXTRA_HEIGHT
        : BASE_ROW_HEIGHT,
    [devices],
  );

  return (
    <List
      className={classes.list}
      rowComponent={DeviceRow}
      rowCount={devices.length}
      rowHeight={getRowHeight}
      rowProps={{ devices }}
      overscanCount={5}
    />
  );
};

export default DeviceList;
