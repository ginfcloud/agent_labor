import { ApiKey, User } from '../models/index.js';
import { randomUUID } from 'crypto';
import { normalizeAddress } from '../utils/crypto.js';

class AuthService {
    /**
     * Sign in: Generate or retrieve API key for wallet
     * Also creates user if not exists
     */
    async signIn(address: string): Promise<{ apiKey: string; user: any }> {
        const normalizedAddress = normalizeAddress(address);

        // Find or create user
        const [user] = await User.findOrCreate({
            where: { address: normalizedAddress },
            defaults: {
                address: normalizedAddress,
                username: `user_${normalizedAddress.slice(2, 10)}`,
            },
        });

        // Find or create API key
        let apiKeyRecord = await ApiKey.findOne({
            where: { address: normalizedAddress },
        });

        if (!apiKeyRecord) {
            // Generate new API key
            const apiKey = randomUUID();
            apiKeyRecord = await ApiKey.create({
                address: normalizedAddress,
                apiKey,
            });
        } else {
            // Update last used time
            await apiKeyRecord.update({ lastUsedAt: new Date() });
        }

        return {
            apiKey: apiKeyRecord.apiKey,
            user: {
                address: user.address,
                username: user.username,
                avatar: user.avatar,
                trustScore: user.trustScore,
            },
        };
    }

    /**
     * Validate API key and return address
     */
    async validateApiKey(apiKey: string): Promise<string | null> {
        const record = await ApiKey.findOne({ where: { apiKey } });

        if (!record) {
            return null;
        }

        // Update last used time
        await record.update({ lastUsedAt: new Date() });

        return record.address;
    }
}

export const authService = new AuthService();
