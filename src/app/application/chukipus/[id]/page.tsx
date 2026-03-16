"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import styles from "./page.module.css";
import BottomNav from "@/components/BottomNav/BottomNav";
import {
  firebaseGet,
  firebaseGetList,
  firebaseUpdate,
} from "@/lib/firebaseMethods";
import { Chukipu, Plan } from "@/types/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

const categoryColors: Record<string, string> = {
  Película: "#e8749a",
  Viaje: "#5b86e5",
  Comida: "#ff7f50",
  Escapada: "#52c788",
  Deporte: "#5b86e5",
  Cena: "#f5a623",
  "Cocina en casa": "#ff7f50",
  Gaming: "#a78bfa",
  "Juego de mesa": "#f5a623",
  Cultura: "#f5a623",
  Lectura: "#52c788",
};

export default function ChukipuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [chukipu, setChukipu] = useState<Chukipu | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<
    { uid: string; displayName: string; photoURL: string }[]
  >([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Listen to members in real-time
    const membersRef = ref(db, `chukipus/${id}/members`);
    const unsubscribe = onValue(
      membersRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const membersData = snapshot.val();
          const uids = Object.keys(membersData).filter(
            (uid) => membersData[uid] === true,
          );

          const usersPromises = uids.map(async (uid) => {
            try {
              const userDoc = await firebaseGet<{
                displayName?: string;
                photoURL?: string;
              }>(`users/${uid}`);
              if (userDoc) {
                return {
                  uid,
                  displayName: userDoc.displayName || "Usuario",
                  photoURL: userDoc.photoURL || "",
                };
              } else {
                // Handler for non-existent users
                return {
                  uid,
                  displayName: "Usuario",
                  photoURL: "",
                };
              }
            } catch (err) {
              console.error("Error fetching user", uid, err);
              return null;
            }
          });

          const users = (await Promise.all(usersPromises)).filter(Boolean) as {
            uid: string;
            displayName: string;
            photoURL: string;
          }[];
          setMembers(users);
        } else {
          setMembers([]);
        }
        setMembersLoading(false);
      },
      (error) => {
        console.error("Error listening to members:", error);
        setMembersLoading(false);
      },
    );

    // Load Chukipu details and plans
    async function load() {
      try {
        const chuki = await firebaseGet<Chukipu>(`chukipus/${id}`);
        if (chuki) {
          setChukipu(chuki);
          const fetchedPlans = await firebaseGetList<Plan>(
            "plans",
            (p) => p.chukipuId === id,
            "createdAt",
            "desc",
          );
          setPlans(fetchedPlans);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <p>Cargando ...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!chukipu) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <p>Chukipu no encontrado</p>
          <button className="btn btn-primary" onClick={() => router.back()}>
            Volver
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const categories = Array.from(new Set(plans.map((p) => p.category)));

  const handleTogglePin = async (plan: Plan) => {
    if (!user || user.uid !== plan.createdBy) return;

    const newShowInProfile = !plan.showInProfile;

    // Optimistic update
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id ? { ...p, showInProfile: newShowInProfile } : p,
      ),
    );

    try {
      await firebaseUpdate(`plans/${plan.id}`, {
        showInProfile: newShowInProfile,
      });
    } catch (err) {
      console.error("Error updating plan visibility:", err);
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, showInProfile: plan.showInProfile } : p,
        ),
      );
    }
  };

  const handleToggleCompleted = async (plan: Plan) => {
    if (!user || user.uid !== plan.createdBy) return;

    const newCompleted = !plan.completed;

    // Optimistic update
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id ? { ...p, completed: newCompleted } : p,
      ),
    );

    try {
      await firebaseUpdate(`plans/${plan.id}`, { completed: newCompleted });
    } catch (err) {
      console.error("Error updating plan completed:", err);
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, completed: plan.completed } : p,
        ),
      );
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero image */}
      <div className={styles.hero}>
        {chukipu.image && (
          <img
            src={chukipu.image}
            alt={chukipu.name}
            className={styles.heroImg}
          />
        )}
        <div className={styles.heroOverlay} />

        {/* Back button */}
        <button
          className={styles.backBtn}
          onClick={() => router.back()}
          aria-label="Volver"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Edit button */}
        <button
          className={styles.editBtn}
          onClick={() => router.push(`/application/chukipus/${id}/edit`)}
          aria-label="Editar Chukipu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {/* Hero content */}
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{chukipu.name}</h1>
          <div className={styles.heroMeta}>
            <span className={styles.heroMetaItem}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {chukipu.planCount} {chukipu.planCount === 1 ? "plan" : "planes"}
            </span>
            <span className={styles.heroMetaDot}>·</span>
            <span className={styles.heroMetaItem}>Actualizado</span>
          </div>

          <div className={styles.membersRow}>
            {membersLoading ? (
              <span className={styles.membersLoading}>Cargando...</span>
            ) : members.length > 0 ? (
              <div className={styles.avatarGroup}>
                {members.map((m, i) => (
                  <div
                    key={m.uid}
                    className={styles.avatarWrapper}
                    style={{ zIndex: members.length - i }}
                  >
                    {m.photoURL ? (
                      <img
                        src={m.photoURL}
                        alt={m.displayName}
                        title={m.displayName}
                        className={styles.memberAvatar}
                      />
                    ) : (
                      <div
                        className={styles.memberAvatarPlaceholder}
                        title={m.displayName}
                      >
                        {m.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actionBar}>
        <button
          className={styles.addPlanBtn}
          onClick={() => router.push(`/application/chukipus/${id}/plans`)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Añadir plan
        </button>
        <button
          className={styles.inviteBtn}
          onClick={() => router.push(`/application/chukipus/${id}/invite`)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Invitar
        </button>
      </div>

      {/* Plans by category */}
      <div className={`page hide-scrollbar`}>
        {plans.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>Este Chukipu está vacío</p>
            <p className={styles.emptyDesc}>
              Añade el primer plan para empezar.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => router.push(`/application/chukipus/${id}/plans`)}
            >
              Añadir plan
            </button>
          </div>
        ) : (
          <>
            {categories.map((category, ci) => (
              <div key={category} className={styles.categorySection}>
                <div className={styles.categoryHeader}>
                  <div
                    className={styles.categoryDot}
                    style={
                      {
                        "--cat-color":
                          categoryColors[category] ?? "var(--brand-primary)",
                      } as React.CSSProperties
                    }
                  />
                  <h2 className={styles.categoryTitle}>{category}</h2>
                  <span className={styles.categoryCount}>
                    {plans.filter((p) => p.category === category).length}
                  </span>
                </div>

                <div className={styles.plansList}>
                  {plans
                    .filter((p) => p.category === category)
                    .map((plan, pi) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        color={
                          categoryColors[plan.category] ??
                          "var(--brand-primary)"
                        }
                        delay={ci * 0.05 + pi * 0.06}
                        onClick={() =>
                          router.push(`/application/chukipus/${id}/plans/${plan.id}`)
                        }
                        isCreator={user?.uid === plan.createdBy}
                        onTogglePin={(e) => {
                          e.stopPropagation();
                          handleTogglePin(plan);
                        }}
                        onToggleCompleted={(e) => {
                          e.stopPropagation();
                          handleToggleCompleted(plan);
                        }}
                      />
                    ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function PlanCard({
  plan,
  color,
  delay,
  onClick,
  isCreator,
  onTogglePin,
  onToggleCompleted,
}: {
  plan: Plan;
  color: string;
  delay: number;
  onClick: () => void;
  isCreator?: boolean;
  onTogglePin?: (e: React.MouseEvent) => void;
  onToggleCompleted?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={styles.planCard}
      style={{ "--delay": `${delay}s` } as React.CSSProperties}
      onClick={onClick}
    >
      {isCreator && (
        <div className={styles.cardActions}>
          <button
            className={`${styles.cardActionBtn} ${plan.completed ? styles.cardActionDone : ""}`}
            onClick={onToggleCompleted}
            aria-label={
              plan.completed ? "Marcar como pendiente" : "Marcar como hecho"
            }
            title={
              plan.completed ? "Marcar como pendiente" : "Marcar como hecho"
            }
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" fill={plan.completed ? "currentColor" : "none"} />
              <polyline points="9 12 11 14 15 10" stroke={plan.completed ? "#166534" : "currentColor"} strokeWidth="2.5" />
            </svg>
          </button>
          <button
            className={`${styles.cardActionBtn} ${plan.showInProfile ? styles.cardActionPinned : ""}`}
            onClick={onTogglePin}
            aria-label={
              plan.showInProfile ? "Quitar del perfil" : "Fijar en el perfil"
            }
            title={
              plan.showInProfile ? "Quitar del perfil" : "Fijar en el perfil"
            }
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={plan.showInProfile ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
            </svg>
          </button>
        </div>
      )}
      <div className={styles.planContent}>
        <h3 className={styles.planTitle}>{plan.title}</h3>
        <p className={styles.planDesc}>{plan.description}</p>
        <div className={styles.planMeta}>
          <div
            className={`${styles.planStatus} ${plan.completed ? styles.planDone : ""}`}
          >
            {plan.completed ? (
              <>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Completado
              </>
            ) : (
              <>
                <div
                  className={styles.pendingDot}
                  style={{ "--cat-color": color } as React.CSSProperties}
                />
                Pendiente
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
