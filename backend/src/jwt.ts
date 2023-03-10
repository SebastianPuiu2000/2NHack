import * as jwt from 'jsonwebtoken';

const jwtSecret: string = process.env.JWT_SECRET || '123456';
const tokenExpirationInSeconds = 36000;

export function getToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
        return null;
    }

    return authHeader.split(' ')[1];
};

export function sign(id: any, name: string, role: string) {
    return jwt.sign({id, name, role}, jwtSecret, {
        expiresIn: tokenExpirationInSeconds,
    });
};

export function verify(token: string): jwt.JwtPayload {
    let payload = jwt.verify(token, jwtSecret);

    if (typeof payload === 'string') {
        throw new Error();
    }

    return payload;
};
