const { ok, created } = require('../../../../shared/utils/response');
const { requireFields, assertBloodType, assertObjectId, parseCoordinate } = require('../../../../shared/utils/validators');
const { EVENTS, EXCHANGES } = require('../../../../shared/constants/eventTypes');
const { toPoint } = require('../../../matching/src/utils/geo');
const stockService = require('../services/stockService');

function buildController({ publisher }) {
  async function stock(req, res, next) {
    try {
      assertObjectId(req.params.id, 'hospitalId');
      return ok(res, await stockService.getHospitalStock(req.params.id));
    } catch (error) {
      return next(error);
    }
  }

  async function reserve(req, res, next) {
    try {
      requireFields(req.body, ['bloodType', 'units']);
      assertBloodType(req.body.bloodType);
      assertObjectId(req.params.id, 'hospitalId');
      const item = await stockService.reserveUnits({
        hospitalId: req.params.id,
        bloodType: req.body.bloodType,
        units: Number(req.body.units)
      });
      publisher?.publish(EXCHANGES.DIRECT, EVENTS.INVENTORY_RESERVED, { hospitalId: req.params.id, bloodType: item.bloodType, units: req.body.units });
      return ok(res, item);
    } catch (error) {
      publisher?.publish(EXCHANGES.DIRECT, EVENTS.INVENTORY_FAILED, { hospitalId: req.params.id, reason: error.message });
      return next(error);
    }
  }

  async function update(req, res, next) {
    try {
      requireFields(req.body, ['bloodType', 'unitsChange', 'lat', 'lng']);
      assertBloodType(req.body.bloodType);
      assertObjectId(req.params.id, 'hospitalId');
      const item = await stockService.updateStock({
        hospitalId: req.params.id,
        bloodType: req.body.bloodType,
        unitsChange: Number(req.body.unitsChange),
        location: toPoint(parseCoordinate(req.body.lng, 'lng'), parseCoordinate(req.body.lat, 'lat'))
      });
      publisher?.publish(EXCHANGES.FANOUT, EVENTS.INVENTORY_UPDATED, { hospitalId: req.params.id, bloodType: item.bloodType, unitsChange: req.body.unitsChange, newTotal: item.unitsAvailable });
      return created(res, item);
    } catch (error) {
      return next(error);
    }
  }

  async function alerts(req, res, next) {
    try {
      return ok(res, await stockService.lowStock(Number(req.query.threshold) || 5));
    } catch (error) {
      return next(error);
    }
  }

  async function transfer(req, res, next) {
    try {
      requireFields(req.body, ['fromHospitalId', 'toHospitalId', 'bloodType', 'units']);
      assertBloodType(req.body.bloodType);
      assertObjectId(req.body.fromHospitalId, 'fromHospitalId');
      assertObjectId(req.body.toHospitalId, 'toHospitalId');
      return created(res, { status: 'requested', ...req.body });
    } catch (error) {
      return next(error);
    }
  }

  return { stock, reserve, update, alerts, transfer };
}

module.exports = { buildController };
