import { UserRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken, JwtPayload } from '../utils/jwt';
import { AppError } from '../middlewares/error-handler';

const userRepo = new UserRepository();

export class AuthService {
  async login(
    username: string,
    password: string
  ): Promise<{ token: string; user: { id: number; username: string; role: string } }> {
    const user = await userRepo.findByUsername(username);
    if (!user || !user.is_active) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const token = generateToken(payload);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async logout(): Promise<void> {
    return;
  }

  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }
}
