import { useState, useEffect } from 'react';
import { z } from 'zod';
import { subDays, addDays, format, isAfter, isBefore } from 'date-fns';

// -- Mock Data Store --

export type Purohit = {
  id: string;
  name: string;
  city: string;
  calendar_system: 'purnimanta' | 'amanta';
  upi_id: string;
  plan: 'trial' | 'annual' | 'monthly' | 'lapsed';
};

export type Yajman = {
  id: string;
  family_name: string;
  gotra: string;
  whatsapp_number: string;
  locality: string;
  consent_status: 'pending' | 'granted' | 'withdrawn';
  family_sub_status: 'none' | 'active' | 'lapsed' | 'cancelled';
};

export type EventType = 'shraddh' | 'katha' | 'birthday' | 'griha_pravesh' | 'namkaran' | 'shanti';
export type Maas = 'Chaitra' | 'Vaishakha' | 'Jyeshtha' | 'Ashadha' | 'Shravana' | 'Bhadrapada' | 'Ashvina' | 'Kartika' | 'Margashirsha' | 'Pausha' | 'Magha' | 'Phalguna';
export type Paksha = 'Shukla' | 'Krishna';

export type RitualEvent = {
  id: string;
  yajman_id: string;
  event_type: EventType;
  maas: Maas;
  paksha: Paksha;
  tithi: number; // 1-15
  last_performed_year: number;
  resolved_date: string; // ISO date
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
};

export type LedgerEntry = {
  id: string;
  yajman_id: string;
  event_id?: string;
  amount: number;
  payment_status: 'pending' | 'claimed' | 'corroborated';
  purohit_claimed_at?: string;
  family_confirmed_at?: string;
  created_at: string;
};

const MOCK_PUROHIT: Purohit = {
  id: 'p-1',
  name: 'Pt. Rameshwar Shastri',
  city: 'Varanasi',
  calendar_system: 'purnimanta',
  upi_id: 'rameshwar.shastri@sbi',
  plan: 'annual'
};

const MOCK_YAJMANS: Yajman[] = [
  { id: 'y-1', family_name: 'Sharma', gotra: 'Kashyap', whatsapp_number: '+919876543210', locality: 'Assi Ghat', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-2', family_name: 'Verma', gotra: 'Bharadwaj', whatsapp_number: '+919876543211', locality: 'Lanka', consent_status: 'granted', family_sub_status: 'active' },
  { id: 'y-3', family_name: 'Tiwari', gotra: 'Vashishtha', whatsapp_number: '+919876543212', locality: 'Sigra', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-4', family_name: 'Mishra', gotra: 'Sandilya', whatsapp_number: '+919876543213', locality: 'Mahmoorganj', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-5', family_name: 'Pandey', gotra: 'Garg', whatsapp_number: '+919876543214', locality: 'Bhelupur', consent_status: 'granted', family_sub_status: 'lapsed' },
  { id: 'y-6', family_name: 'Dubey', gotra: 'Koundinya', whatsapp_number: '+919876543215', locality: 'Chetganj', consent_status: 'pending', family_sub_status: 'none' },
  { id: 'y-7', family_name: 'Singh', gotra: 'Gautam', whatsapp_number: '+919876543216', locality: 'Cantt', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-8', family_name: 'Agnihotri', gotra: 'Vatsa', whatsapp_number: '+919876543217', locality: 'Ramnagar', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-9', family_name: 'Chaturvedi', gotra: 'Kashyap', whatsapp_number: '+919876543218', locality: 'Shivpur', consent_status: 'granted', family_sub_status: 'active' },
  { id: 'y-10', family_name: 'Upadhyay', gotra: 'Bharadwaj', whatsapp_number: '+919876543219', locality: 'Sarnath', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-11', family_name: 'Joshi', gotra: 'Vashishtha', whatsapp_number: '+919876543220', locality: 'Assi Ghat', consent_status: 'pending', family_sub_status: 'none' },
  { id: 'y-12', family_name: 'Pathak', gotra: 'Sandilya', whatsapp_number: '+919876543221', locality: 'Lanka', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-13', family_name: 'Shukla', gotra: 'Garg', whatsapp_number: '+919876543222', locality: 'Sigra', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-14', family_name: 'Tripathi', gotra: 'Koundinya', whatsapp_number: '+919876543223', locality: 'Mahmoorganj', consent_status: 'granted', family_sub_status: 'none' },
  { id: 'y-15', family_name: 'Bhatt', gotra: 'Gautam', whatsapp_number: '+919876543224', locality: 'Bhelupur', consent_status: 'granted', family_sub_status: 'active' },
];

const today = new Date();

const MOCK_EVENTS: RitualEvent[] = [
  { id: 'e-1', yajman_id: 'y-1', event_type: 'shraddh', maas: 'Bhadrapada', paksha: 'Krishna', tithi: 12, last_performed_year: 2025, resolved_date: format(addDays(today, 2), 'yyyy-MM-dd') },
  { id: 'e-2', yajman_id: 'y-2', event_type: 'katha', maas: 'Kartika', paksha: 'Shukla', tithi: 15, last_performed_year: 2024, resolved_date: format(addDays(today, 5), 'yyyy-MM-dd'), start_time: '09:00', end_time: '11:00' },
  { id: 'e-3', yajman_id: 'y-3', event_type: 'birthday', maas: 'Chaitra', paksha: 'Shukla', tithi: 9, last_performed_year: 2025, resolved_date: format(addDays(today, 1), 'yyyy-MM-dd') },
  { id: 'e-4', yajman_id: 'y-4', event_type: 'griha_pravesh', maas: 'Vaishakha', paksha: 'Shukla', tithi: 3, last_performed_year: 2025, resolved_date: format(addDays(today, 8), 'yyyy-MM-dd') },
  { id: 'e-5', yajman_id: 'y-5', event_type: 'katha', maas: 'Shravana', paksha: 'Shukla', tithi: 5, last_performed_year: 2023, resolved_date: format(subDays(today, 30), 'yyyy-MM-dd') }, // Overdue
  { id: 'e-6', yajman_id: 'y-7', event_type: 'shraddh', maas: 'Bhadrapada', paksha: 'Krishna', tithi: 2, last_performed_year: 2025, resolved_date: format(addDays(today, 4), 'yyyy-MM-dd') },
  { id: 'e-7', yajman_id: 'y-8', event_type: 'namkaran', maas: 'Ashadha', paksha: 'Shukla', tithi: 10, last_performed_year: 2025, resolved_date: format(addDays(today, 14), 'yyyy-MM-dd') },
  { id: 'e-8', yajman_id: 'y-9', event_type: 'shanti', maas: 'Phalguna', paksha: 'Krishna', tithi: 8, last_performed_year: 2025, resolved_date: format(subDays(today, 10), 'yyyy-MM-dd') },
  { id: 'e-9', yajman_id: 'y-10', event_type: 'shraddh', maas: 'Bhadrapada', paksha: 'Krishna', tithi: 14, last_performed_year: 2022, resolved_date: format(addDays(today, 10), 'yyyy-MM-dd') }, // Overdue
  { id: 'e-10', yajman_id: 'y-1', event_type: 'katha', maas: 'Kartika', paksha: 'Shukla', tithi: 11, last_performed_year: 2024, resolved_date: format(addDays(today, 5), 'yyyy-MM-dd'), start_time: '10:00', end_time: '12:00' }, // Conflict with e-2
];

const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'l-1', yajman_id: 'y-8', event_id: 'e-8', amount: 1100, payment_status: 'corroborated', purohit_claimed_at: format(subDays(today, 9), "yyyy-MM-dd'T'HH:mm:ss'Z'"), family_confirmed_at: format(subDays(today, 9), "yyyy-MM-dd'T'HH:mm:ss'Z'"), created_at: format(subDays(today, 10), "yyyy-MM-dd'T'HH:mm:ss'Z'") },
  { id: 'l-2', yajman_id: 'y-5', amount: 501, payment_status: 'claimed', purohit_claimed_at: format(subDays(today, 2), "yyyy-MM-dd'T'HH:mm:ss'Z'"), created_at: format(subDays(today, 2), "yyyy-MM-dd'T'HH:mm:ss'Z'") },
  { id: 'l-3', yajman_id: 'y-12', amount: 2100, payment_status: 'pending', created_at: format(subDays(today, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'") },
  { id: 'l-4', yajman_id: 'y-2', event_id: 'e-2', amount: 1500, payment_status: 'corroborated', purohit_claimed_at: format(subDays(today, 365), "yyyy-MM-dd'T'HH:mm:ss'Z'"), family_confirmed_at: format(subDays(today, 365), "yyyy-MM-dd'T'HH:mm:ss'Z'"), created_at: format(subDays(today, 366), "yyyy-MM-dd'T'HH:mm:ss'Z'") },
];

export function useSmaranStore() {
  const [purohit, setPurohit] = useState<Purohit>(MOCK_PUROHIT);
  const [yajmans, setYajmans] = useState<Yajman[]>(MOCK_YAJMANS);
  const [events, setEvents] = useState<RitualEvent[]>(MOCK_EVENTS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(MOCK_LEDGER);

  const getUpcomingEvents = () => {
    const sorted = [...events].sort((a, b) => new Date(a.resolved_date).getTime() - new Date(b.resolved_date).getTime());
    return sorted.filter(e => isAfter(new Date(e.resolved_date), subDays(today, 1)));
  };

  const getOverdueEvents = () => {
    const currentYear = new Date().getFullYear();
    return events.filter(e => e.last_performed_year < currentYear - 1);
  };

  const addYajman = (y: Omit<Yajman, 'id'>) => {
    const newY = { ...y, id: `y-${Date.now()}` };
    setYajmans(prev => [...prev, newY]);
    return newY;
  };

  const addEvent = (e: Omit<RitualEvent, 'id'>) => {
    const newE = { ...e, id: `e-${Date.now()}` };
    setEvents(prev => [...prev, newE]);
    return newE;
  };

  const updateLedgerStatus = (id: string, status: 'claimed' | 'corroborated') => {
    setLedger(prev => prev.map(l => {
      if (l.id === id) {
        const updates: Partial<LedgerEntry> = { payment_status: status };
        if (status === 'claimed') updates.purohit_claimed_at = new Date().toISOString();
        if (status === 'corroborated') updates.family_confirmed_at = new Date().toISOString();
        return { ...l, ...updates };
      }
      return l;
    }));
  };
  
  const addLedgerEntry = (entry: Omit<LedgerEntry, 'id' | 'created_at'>) => {
    const newL: LedgerEntry = {
      ...entry,
      id: `l-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setLedger(prev => [newL, ...prev]);
    return newL;
  };

  return {
    purohit,
    yajmans,
    events,
    ledger,
    getUpcomingEvents,
    getOverdueEvents,
    addYajman,
    addEvent,
    updateLedgerStatus,
    addLedgerEntry
  };
}
