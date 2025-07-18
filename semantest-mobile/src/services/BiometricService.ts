import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Platform } from 'react-native';

class BiometricServiceClass {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
  }

  async isBiometricSupported(): Promise<{
    supported: boolean;
    biometryType: BiometryTypes | null;
  }> {
    try {
      const { biometryType, available } = await this.rnBiometrics.isSensorAvailable();
      
      return {
        supported: available,
        biometryType: biometryType || null,
      };
    } catch (error) {
      console.error('Biometric check error:', error);
      return {
        supported: false,
        biometryType: null,
      };
    }
  }

  async authenticate(reason?: string): Promise<boolean> {
    try {
      const { supported } = await this.isBiometricSupported();
      
      if (!supported) {
        throw new Error('Biometric authentication not supported');
      }

      const { success } = await this.rnBiometrics.simplePrompt({
        promptMessage: reason || 'Authenticate to access Semantest',
        fallbackPromptMessage: 'Use passcode',
        cancelButtonText: 'Cancel',
      });

      return success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  async createKeys(): Promise<boolean> {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys();
      console.log('Biometric keys created:', publicKey);
      return true;
    } catch (error) {
      console.error('Create keys error:', error);
      return false;
    }
  }

  async deleteKeys(): Promise<boolean> {
    try {
      const { keysDeleted } = await this.rnBiometrics.deleteKeys();
      return keysDeleted;
    } catch (error) {
      console.error('Delete keys error:', error);
      return false;
    }
  }

  async createSignature(
    payload: string,
    promptMessage?: string
  ): Promise<{ signature: string; success: boolean }> {
    try {
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: promptMessage || 'Sign in to Semantest',
        payload,
        cancelButtonText: 'Cancel',
      });

      return {
        success,
        signature: signature || '',
      };
    } catch (error) {
      console.error('Create signature error:', error);
      return {
        success: false,
        signature: '',
      };
    }
  }

  async biometricKeysExist(): Promise<boolean> {
    try {
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      return keysExist;
    } catch (error) {
      console.error('Keys exist check error:', error);
      return false;
    }
  }

  getBiometryTypeString(biometryType: BiometryTypes | null): string {
    switch (biometryType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return Platform.OS === 'android' ? 'Fingerprint' : 'Biometrics';
      default:
        return 'Biometric Authentication';
    }
  }

  async setupBiometricAuth(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { supported, biometryType } = await this.isBiometricSupported();
      
      if (!supported) {
        return {
          success: false,
          message: 'Biometric authentication is not available on this device',
        };
      }

      const keysCreated = await this.createKeys();
      if (!keysCreated) {
        return {
          success: false,
          message: 'Failed to create biometric keys',
        };
      }

      const biometryName = this.getBiometryTypeString(biometryType);
      return {
        success: true,
        message: `${biometryName} has been enabled successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to setup biometric authentication',
      };
    }
  }

  async disableBiometricAuth(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const keysDeleted = await this.deleteKeys();
      
      return {
        success: keysDeleted,
        message: keysDeleted
          ? 'Biometric authentication has been disabled'
          : 'Failed to disable biometric authentication',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error disabling biometric authentication',
      };
    }
  }
}

export const BiometricService = new BiometricServiceClass();