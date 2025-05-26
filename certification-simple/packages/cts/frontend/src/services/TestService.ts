// services/TestService.ts
import axios from 'axios';
import { PipelineType } from '../types/PipelineType';

const API_BASE_URL = 'http://localhost:5005/api';

export class TestService {
  static async getDag() {
    try {
      const response = await axios.get(`${API_BASE_URL}/dag`);
      return response.data.dag;
    } catch (error) {
      console.error('Error fetching DAG:', error);
      throw error;
    }
  }

  static async selectPipeline(pipeline: PipelineType) {
    try {
      const response = await axios.get(`${API_BASE_URL}/select/pipeline`, {
        params: { pipeline }
      });
      return response.data;
    } catch (error) {
      console.error('Error selecting pipeline:', error);
      throw error;
    }
  }

  static async runPipeline() {
    try {
      const response = await axios.get(`${API_BASE_URL}/run`);
      return response.data;
    } catch (error) {
      console.error('Error running pipeline:', error);
      throw error;
    }
  }

  static async getInvitation() {
    try {
      const response = await axios.get(`${API_BASE_URL}/invitation`);
      return response.data.invite;
    } catch (error) {
      console.error('Error fetching invitation:', error);
      throw error;
    }
  }

  // TRQP testing specific methods
  static async setTrqpDid(did: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/trqp/did`, { did });
      return response.data;
    } catch (error) {
      console.error('Error setting TRQP DID:', error);
      throw error;
    }
  }

  static async setTrqpEndpoint(endpoint: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/trqp/endpoint`, { endpoint });
      return response.data;
    } catch (error) {
      console.error('Error setting TRQP endpoint:', error);
      throw error;
    }
  }

  static async getTrqpConfig() {
    try {
      const response = await axios.get(`${API_BASE_URL}/trqp/config`);
      return response.data;
    } catch (error) {
      console.error('Error fetching TRQP config:', error);
      throw error;
    }
  }

  static async verifyTrqpAuthorization(entity: string, action: string, objects: string[] = []) {
    try {
      const response = await axios.post(`${API_BASE_URL}/trqp/verify`, {
        entity,
        action,
        objects
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying TRQP authorization:', error);
      throw error;
    }
  }
}
