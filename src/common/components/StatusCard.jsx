import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import dayjs from 'dayjs';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  CardMedia,
  TableFooter,
  Link,
  Tooltip,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';

const formatGeofenceDuration = (durationMs) => {
  if (durationMs == null || durationMs < 0) {
    return null;
  }
  const totalMins = Math.floor(durationMs / 60000);
  if (totalMins < 1) {
    return '< 1m';
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
};

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: theme.dimensions.popupMaxWidth,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0, 2),
    color: theme.palette.text.secondary,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    '& > div': {
      color: theme.palette.common.white,
      mixBlendMode: 'difference',
    },
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
  },
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiTableCell-sizeSmall:first-of-type': {
      paddingRight: theme.spacing(1),
    },
  },
  cell: {
    borderBottom: 'none',
  },
  geofenceSection: {
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(1.25),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  geofenceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.75),
  },
  geofenceTitle: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
  },
  geofenceCount: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  geofenceBox: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    backgroundColor:
      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
    overflow: 'hidden',
  },
  geofenceEmpty: {
    padding: theme.spacing(1.25, 1.5),
    textAlign: 'center',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
  },
  geofenceList: {
    maxHeight: 136,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  geofenceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 1.25),
    fontSize: '0.78rem',
    '&:not(:last-child)': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
  geofenceItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    minWidth: 0,
    flex: 1,
  },
  geofenceBadgeEnter: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: theme.palette.success.main,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  geofenceBadgeExit: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: theme.palette.warning.main,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  geofenceName: {
    fontSize: '0.78rem',
    fontWeight: 500,
    color: theme.palette.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  geofenceItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0,
    fontSize: '0.74rem',
    color: theme.palette.text.secondary,
    fontVariantNumeric: 'tabular-nums',
  },
  geofenceDuration: {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  actions: {
    justifyContent: 'space-between',
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: '50%',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
    transform: 'translateX(-50%)',
  },
}));

const StatusRow = ({ name, content }) => {
  const { classes } = useStyles({ desktopPadding: 0 });

  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2">{name}</Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">
          {content}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes, cx } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);
  const geofences = useSelector((state) => state.geofences.items);
  const liveEvents = useSelector((state) => state.events.items);

  const deviceImage = device?.attributes?.deviceImage;

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [fetchedEvents, setFetchedEvents] = useState([]);
  const [fetchedIntervals, setFetchedIntervals] = useState([]);

  const geofenceIdsKey = (position?.geofenceIds || []).join(',');

  useEffect(() => {
    if (!deviceId) {
      setFetchedEvents([]);
      setFetchedIntervals([]);
      return undefined;
    }
    const controller = new AbortController();
    const from = dayjs().subtract(1, 'day').startOf('day').toISOString();
    const to = dayjs().endOf('day').toISOString();

    const loadTodayGeofences = async () => {
      try {
        const eventsQuery = new URLSearchParams({ deviceId, from, to });
        eventsQuery.append('type', 'geofenceEnter');
        eventsQuery.append('type', 'geofenceExit');
        const [eventsRes, intervalsRes] = await Promise.all([
          fetch(`/api/reports/events?${eventsQuery.toString()}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }),
          fetch(
            `/api/reports/geofences?${new URLSearchParams({ deviceId, from, to }).toString()}`,
            {
              headers: { Accept: 'application/json' },
              signal: controller.signal,
            },
          ),
        ]);
        if (eventsRes.ok) {
          setFetchedEvents(await eventsRes.json());
        }
        if (intervalsRes.ok) {
          setFetchedIntervals(await intervalsRes.json());
        }
      } catch {
        // ignore abort or network errors
      }
    };

    loadTodayGeofences();
    return () => controller.abort();
  }, [deviceId, geofenceIdsKey]);

  const todayGeofenceEvents = useMemo(() => {
    if (!deviceId) {
      return [];
    }
    const startOfToday = dayjs().startOf('day');
    const combinedMap = new Map();

    fetchedEvents.forEach((ev) => {
      if (ev.deviceId === deviceId && (ev.type === 'geofenceEnter' || ev.type === 'geofenceExit')) {
        const key = ev.id || `${ev.type}_${ev.geofenceId}_${ev.eventTime}`;
        combinedMap.set(key, ev);
      }
    });

    liveEvents.forEach((ev) => {
      if (ev.deviceId === deviceId && (ev.type === 'geofenceEnter' || ev.type === 'geofenceExit')) {
        const key = ev.id || `${ev.type}_${ev.geofenceId}_${ev.eventTime}`;
        combinedMap.set(key, ev);
      }
    });

    // If /api/reports/geofences returned intervals not present in events, synthesize enter/exit
    if (combinedMap.size === 0 && fetchedIntervals.length > 0) {
      fetchedIntervals.forEach((interval) => {
        if (interval.deviceId === deviceId) {
          if (interval.startTime) {
            const enterKey = `geofenceEnter_${interval.geofenceId}_${interval.startTime}`;
            combinedMap.set(enterKey, {
              id: enterKey,
              deviceId,
              geofenceId: interval.geofenceId,
              type: 'geofenceEnter',
              eventTime: interval.startTime,
              durationMs:
                interval.startTime && interval.endTime
                  ? Math.max(0, Date.parse(interval.endTime) - Date.parse(interval.startTime))
                  : null,
            });
          }
          if (interval.endTime) {
            const exitKey = `geofenceExit_${interval.geofenceId}_${interval.endTime}`;
            combinedMap.set(exitKey, {
              id: exitKey,
              deviceId,
              geofenceId: interval.geofenceId,
              type: 'geofenceExit',
              eventTime: interval.endTime,
            });
          }
        }
      });
    }

    const chronological = Array.from(combinedMap.values()).sort(
      (a, b) => dayjs(a.eventTime).valueOf() - dayjs(b.eventTime).valueOf(),
    );

    const enriched = chronological.map((ev) => ({ ...ev }));
    const lastEnterIndexByGeofence = {};

    enriched.forEach((ev, idx) => {
      if (ev.type === 'geofenceEnter') {
        lastEnterIndexByGeofence[ev.geofenceId] = idx;
      } else if (ev.type === 'geofenceExit') {
        const enterIdx = lastEnterIndexByGeofence[ev.geofenceId];
        if (enterIdx !== undefined) {
          const enterEvent = enriched[enterIdx];
          enterEvent.durationMs = Math.max(
            0,
            dayjs(ev.eventTime).valueOf() - dayjs(enterEvent.eventTime).valueOf(),
          );
          delete lastEnterIndexByGeofence[ev.geofenceId];
        }
      }
    });

    // Fallback to fetchedIntervals if an enter event has a matching completed interval
    enriched.forEach((ev) => {
      if (ev.type === 'geofenceEnter' && ev.durationMs == null && fetchedIntervals.length > 0) {
        const matchedInterval = fetchedIntervals.find(
          (it) =>
            it.geofenceId === ev.geofenceId &&
            it.startTime &&
            it.endTime &&
            Math.abs(Date.parse(it.startTime) - Date.parse(ev.eventTime)) < 60000,
        );
        if (matchedInterval) {
          ev.durationMs = Math.max(
            0,
            Date.parse(matchedInterval.endTime) - Date.parse(matchedInterval.startTime),
          );
        }
      }
    });

    return enriched.filter((ev) => !dayjs(ev.eventTime).isBefore(startOfToday));
  }, [deviceId, fetchedEvents, fetchedIntervals, liveEvents]);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: t('sharedGeofence'),
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    const item = await response.json();
    await fetchOrThrow('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
    });
    navigate(`/settings/geofence/${item.id}`);
  }, [navigate, position, t]);

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={3} className={classes.card}>
              <CardMedia
                className={cx('draggable-header', deviceImage && classes.media)}
                image={deviceImage && `/api/media/${device.uniqueId}/${deviceImage}`}
              >
                <div className={classes.header}>
                  <Typography variant="body2" color="inherit">
                    {device.name}
                  </Typography>
                  <IconButton size="small" color="inherit" onClick={onClose} onTouchStart={onClose}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              </CardMedia>
              <CardContent className={classes.content}>
                {position && (
                  <Table size="small" className={classes.table}>
                    <TableBody>
                      {positionItems
                        .split(',')
                        .filter(
                          (key) =>
                            position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key),
                        )
                        .map((key) => (
                          <StatusRow
                            key={key}
                            name={positionAttributes[key]?.name || key}
                            content={
                              <PositionValue
                                position={position}
                                property={position.hasOwnProperty(key) ? key : null}
                                attribute={position.hasOwnProperty(key) ? null : key}
                              />
                            }
                          />
                        ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className={classes.cell}>
                          <Typography variant="body2">
                            <Link component={RouterLink} to={`/position/${position.id}`}>
                              {t('sharedShowDetails')}
                            </Link>
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                )}
                <div className={classes.geofenceSection}>
                  <div className={classes.geofenceHeader}>
                    <span className={classes.geofenceTitle}>TODAY&apos;S GEOFENCES</span>
                    <span className={classes.geofenceCount}>
                      {`${todayGeofenceEvents.length} ${todayGeofenceEvents.length === 1 ? 'event' : 'events'}`}
                    </span>
                  </div>
                  <div className={classes.geofenceBox}>
                    {todayGeofenceEvents.length === 0 ? (
                      <div className={classes.geofenceEmpty}>
                        No geofences entered or exited today
                      </div>
                    ) : (
                      <div className={classes.geofenceList}>
                        {todayGeofenceEvents.map((ev) => {
                          const isEnter = ev.type === 'geofenceEnter';
                          const geofenceName =
                            geofences[ev.geofenceId]?.name ||
                            ev.attributes?.geofence ||
                            `Geofence #${ev.geofenceId}`;
                          const durationText = isEnter
                            ? formatGeofenceDuration(ev.durationMs)
                            : null;
                          return (
                            <div
                              key={ev.id || `${ev.type}_${ev.geofenceId}_${ev.eventTime}`}
                              className={classes.geofenceItem}
                            >
                              <div className={classes.geofenceItemLeft}>
                                <span
                                  className={
                                    isEnter ? classes.geofenceBadgeEnter : classes.geofenceBadgeExit
                                  }
                                >
                                  {isEnter ? 'IN' : 'OUT'}
                                </span>
                                <span className={classes.geofenceName} title={geofenceName}>
                                  {geofenceName}
                                </span>
                              </div>
                              <div className={classes.geofenceItemRight}>
                                {durationText && (
                                  <span className={classes.geofenceDuration}>
                                    {`(${durationText})`}
                                  </span>
                                )}
                                <span>{dayjs(ev.eventTime).format('HH:mm')}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardActions className={classes.actions} disableSpacing>
                <Tooltip title={t('sharedExtra')}>
                  <IconButton
                    color="secondary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    disabled={!position}
                  >
                    <PendingIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('reportReplay')}>
                  <IconButton
                    onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                    disabled={disableActions || !position}
                  >
                    <RouteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('commandTitle')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                    disabled={disableActions}
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedEdit')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}`)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedRemove')}>
                  <IconButton
                    color="error"
                    onClick={() => setRemoving(true)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Rnd>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => navigate(`/stream?deviceId=${deviceId}`)}
            disabled={position.protocol !== 'jt808'}
          >
            {t('linkLiveVideo')}
          </MenuItem>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && navigationAppLink && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
