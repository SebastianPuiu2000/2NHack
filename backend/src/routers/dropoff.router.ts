import * as express from 'express';
import { getToken, verify } from '../jwt';
import { JwtPayload } from 'jsonwebtoken';
import { userRole } from '../models/user.model';
import { Supply, Dropoff, DropoffModel } from '../models/dropoff.model';
import { RequestModel } from '../models/requests.model';
import { isDesiredRole } from '../utils';

export const dropoffRouter = express.Router();

function areDropoffsTooClose(dropoff1: any, dropoff2: any): boolean {
    let tolerance = 0.05;
    let distance = Math.sqrt((dropoff1.lat - dropoff2.lat)**2 + (dropoff1.lng - dropoff2.lng)**2);
    if (distance > tolerance) {
        return false;
    }

    return true;
}

// Get dropoff points around a given location
dropoffRouter.get('/', async (req, res) => {
    if (!req.query.lat || !req.query.lng) {
        return res.status(400).json({success: false, dropoffs: []});
    }

    let requestLat = Number(req.query.lat);
    let requestLng = Number(req.query.lng);

    let nearbyDropoffs = await DropoffModel.find({
        $and: [
            {lat: {$gte: requestLat - 1, $lte: requestLat + 1}},
            {lng: {$gte: requestLng - 1, $lte: requestLng + 1}}
        ]
    });

    // Get matching requests for each nearby dropoff
    let response = await Promise.all(nearbyDropoffs.map(async nearbyDropoff => {
        let associatedRequests = await RequestModel.find({
            dropoffId: nearbyDropoff._id
        });
        return {
            dropoff: nearbyDropoff,
            requests: associatedRequests
        };
    }));

    return res.json({success: true, dropoffs: response});
});

// Add dropoff
dropoffRouter.post('/', async (req, res) => {
    let token = getToken(req.headers.authorization);
    if (!token) {
        return res.status(400).json({success: false});
    }

    let payload: JwtPayload = verify(token);
    let dropoff: Dropoff = req.body;
    if (!payload || !dropoff || !dropoff.lat || !dropoff.lng) {
        return res.status(400).json({success: false});
    }
    if (!isDesiredRole(payload, userRole.Delivery)) {
        return res.status(401).json({success: false});
    }

    // Check if it's not too close to other dropoffs
    let existingDropoffs = await DropoffModel.find();
    for (let existingDropoff of existingDropoffs) {
        if (areDropoffsTooClose(dropoff, existingDropoff)) {
            return res.status(406).json({success: false, message: 'Dropoff too close to other dropoffs!'});
        }
    }

    await DropoffModel.create({
        userId: payload.id,
        lat: dropoff.lat,
        lng: dropoff.lng
    });

    return res.json({success: true});
});

// Add supplies to dropoff
dropoffRouter.put('/', async (req, res) => {
    let token = getToken(req.headers.authorization);
    if (!token) {
        return res.status(400).json({success: false});
    }
    
    let payload: JwtPayload = verify(token);
    let body: {id: any, supplies: Supply[]} = req.body;
    if (!payload || !body || !body.id || !body.supplies) {
        return res.status(400).json({success: false});
    }
    if (!isDesiredRole(payload, userRole.Donator)) {
        return res.status(401).json({success: false})
    }

    let mongoDropoff = await DropoffModel.findById(body.id);
    if (!mongoDropoff) {
        return res.status(400).json({success: false});
    }
    for (let supply of body.supplies) {
        if (supply.quantity <= 0) {
            continue;
        }
        let found = false;
        for (let mongoSupply of mongoDropoff.supplies) {
            if (supply.type === mongoSupply.type) {
                mongoSupply.quantity = Number(supply.quantity) + Number(mongoSupply.quantity);
                found = true;
                break;
            }
        }
        if (!found) {
            mongoDropoff.supplies.push(supply);
        }
    }
    await mongoDropoff.save();

    return res.json({success: true});
});

// Complete request at dropoff
dropoffRouter.post('/complete_request', async (req, res) => {
    let token = getToken(req.headers.authorization);
    if (!token) {
        return res.status(400).json({success: false});
    }

    let payload: JwtPayload = verify(token);
    let requestId = req.body.requestId;
    if (!payload || !requestId) {
        return res.status(400).json({success: false});
    }
    if (!isDesiredRole(payload, userRole.Delivery) &&
        !isDesiredRole(payload, userRole.SuppliesConsumer)) {
        return res.status(401).json({success: false});
    }

    let mongoRequest = await RequestModel.findById(requestId);
    if (!mongoRequest) {
        return res.status(400).json({success: false});
    }
    let mongoDropoff = await DropoffModel.findById(mongoRequest.dropoffId);
    if (!mongoDropoff) {
        return res.status(400).json({success: false});
    }

    // Decrease fulfilled requests' quantities
    let notFoundSupplies: any[] = [];
    for (let supply of mongoRequest.supplies) {
        let found = false;
        for (let dropoffSupply of mongoDropoff.supplies) {
            if (dropoffSupply.type === supply.type) {
                dropoffSupply.quantity = Number(dropoffSupply.quantity) - Number(supply.quantity);
                found = true;
                break;
            }
        }
        if (!found) {
            notFoundSupplies.push(supply);
        }
    }
    for(let i = 0; i < mongoDropoff.supplies.length; i++) { 
        if(Number(mongoDropoff.supplies[i].quantity) <= 0) {
            mongoDropoff.supplies.splice(i, 1); 
        }
    }
    // Create new request (at the same dropoff) with the not found supplies
    await RequestModel.create({
        dropoffId: mongoRequest.dropoffId,
        userId: payload.id,
        supplies: notFoundSupplies,
        lat: mongoRequest.lat,
        lng: mongoRequest.lng
    });

    await mongoRequest.deleteOne();
    await mongoDropoff.save();


    return res.json({success: true});
});
