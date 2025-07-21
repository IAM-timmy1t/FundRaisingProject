import request from 'supertest';
import app from '../../server';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Security Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test user and get auth token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    
    authToken = response.body.token;
  });

  describe('SQL Injection Tests', () => {
    it('should prevent SQL injection in login', async () => {
      const maliciousPayloads = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "' OR 1=1 --",
        "admin' /*",
        "admin' #"
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: payload,
            password: 'password'
          });

        expect(response.status).toBe(400);
        expect(response.body).not.toContain('sql');
        expect(response.body).not.toContain('database');
      }
    });

    it('should prevent SQL injection in campaign search', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns')
        .query({ search: "'; DROP TABLE campaigns; --" })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Should return empty results, not error
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('XSS Prevention Tests', () => {
    it('should sanitize user input for XSS', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/v1/campaigns')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: payload,
            description: payload,
            goal_amount: 1000
          });

        if (response.status === 201) {
          expect(response.body.data.title).not.toContain('<script>');
          expect(response.body.data.title).not.toContain('javascript:');
          expect(response.body.data.description).not.toContain('<script>');
        }
      }
    });
  });

  describe('Authentication Bypass Tests', () => {
    it('should prevent access without valid token', async () => {
      const protectedEndpoints = [
        '/api/v1/campaigns/create',
        '/api/v1/donations/create',
        '/api/v1/user/profile',
        '/api/v1/admin/users'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({});

        expect(response.status).toBe(401);
      }
    });

    it('should prevent token manipulation', async () => {
      const manipulatedTokens = [
        authToken + 'extra',
        authToken.slice(0, -5),
        'Bearer ' + authToken,
        btoa(authToken),
        authToken.replace(/\./g, '_')
      ];

      for (const token of manipulatedTokens) {
        const response = await request(app)
          .get('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('File Upload Security Tests', () => {
    it('should reject malicious file types', async () => {
      const maliciousFiles = [
        { name: 'test.exe', content: Buffer.from('MZ'), type: 'application/x-msdownload' },
        { name: 'test.php', content: Buffer.from('<?php'), type: 'application/x-php' },
        { name: 'test.jsp', content: Buffer.from('<%'), type: 'application/x-jsp' },
        { name: 'test.sh', content: Buffer.from('#!/bin/bash'), type: 'application/x-sh' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/v1/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', file.content, {
            filename: file.name,
            contentType: file.type
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('not allowed');
      }
    });

    it('should enforce file size limits', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      const response = await request(app)
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('size');
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const promises = [];
      
      // Make 101 requests (limit is 100)
      for (let i = 0; i < 101; i++) {
        promises.push(
          request(app)
            .get('/api/v1/campaigns')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should enforce strict rate limits on auth endpoints', async () => {
      const promises = [];
      
      // Make 6 login attempts (limit is 5)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrong_password'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('CSRF Protection Tests', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Campaign',
          goal_amount: 1000
        });

      // Without CSRF token
      expect(response.status).toBe(403);
    });
  });

  afterAll(async () => {
    // Cleanup
  });
});