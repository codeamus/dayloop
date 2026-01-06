// src/infraestructure/notifications/notificationCopy.ts
export function buildHabitNotificationText(icon: string, name: string) {
  const variants = [
    `${icon} Es momento de "${name}"`,
    `${icon} Tu hábito "${name}" te espera`,
    `${icon} Mantén la racha: ${name}`,
    `${icon} Un pequeño paso cuenta: ${name}`,
    `${icon} Vamos con "${name}"`,
  ];

  return variants[Math.floor(Math.random() * variants.length)];
}
