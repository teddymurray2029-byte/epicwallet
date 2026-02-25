import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/WalletContext';
import { FileText, Pill, ClipboardList, Heart, Code, UserCheck, FileSignature, CalendarCheck, Stethoscope, Activity } from 'lucide-react';

const EVENT_TEMPLATES = [
  { type: 'Encounter Note', icon: FileText, reward: 9.0, patients: ['John M.', 'Sarah K.', 'Maria G.', 'David P.', 'Linda T.', 'Tom R.'] },
  { type: 'Discharge Summary', icon: ClipboardList, reward: 9.0, patients: ['Robert L.', 'James W.', 'Nancy H.'] },
  { type: 'Medication Reconciliation', icon: Pill, reward: 7.2, patients: ['Alice B.', 'Frank D.'] },
  { type: 'Problem List Update', icon: Activity, reward: 4.8, patients: ['Beth C.', 'Carl E.'] },
  { type: 'Preventive Care', icon: Heart, reward: 6.0, patients: ['Diana F.', 'Eric G.'] },
  { type: 'Coding Finalized', icon: Code, reward: 4.8, patients: ['George H.', 'Helen I.'] },
  { type: 'Intake Completed', icon: UserCheck, reward: 4.8, patients: ['Ivan J.', 'Karen L.'] },
  { type: 'Consent Signed', icon: FileSignature, reward: 4.8, patients: ['Mark N.'] },
  { type: 'Follow-up Completed', icon: CalendarCheck, reward: 6.0, patients: ['Olivia Q.'] },
];

/**
 * Simulates real-time charting notifications every 15-45 seconds.
 * Only active when provider is connected and registered.
 */
export function ChartingNotifications() {
  const { entity, isProvider } = useWallet();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!entity || !isProvider) return;

    const scheduleNext = () => {
      const delay = 15_000 + Math.random() * 30_000; // 15-45s
      timerRef.current = setTimeout(() => {
        const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
        const patient = template.patients[Math.floor(Math.random() * template.patients.length)];
        const Icon = template.icon;

        toast(template.type, {
          description: `+${template.reward.toFixed(2)} CARE earned — Patient: ${patient}`,
          icon: <Icon className="h-4 w-4 text-primary" />,
          duration: 5000,
          action: {
            label: 'View',
            onClick: () => window.location.assign('/provider/activity'),
          },
        });

        scheduleNext();
      }, delay);
    };

    // First notification after 8-15 seconds
    const initialDelay = 8_000 + Math.random() * 7_000;
    timerRef.current = setTimeout(() => {
      const template = EVENT_TEMPLATES[0];
      const patient = template.patients[0];
      const Icon = template.icon;

      toast.success('Chart-to-Earn Active', {
        description: `${template.type}: +${template.reward.toFixed(2)} CARE — ${patient}`,
        icon: <Stethoscope className="h-4 w-4" />,
        duration: 6000,
      });

      scheduleNext();
    }, initialDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [entity, isProvider]);

  return null; // Render-less component
}
