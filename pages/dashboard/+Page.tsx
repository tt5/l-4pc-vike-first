interface PageProps {
  user: {
    userId: string;
    username: string;
    role?: 'admin' | 'user';
  };
}

export default function Page({ user }: PageProps) {
  return (
    <>
      <h1>Dashboard (Protected)</h1>
      <div
        style={{
          padding: "20px",
          "background-color": "#e8f5e9",
          "border-radius": "4px",
          "margin-top": "20px",
        }}
      >
        <h2>Welcome, {user.username}!</h2>
        <p>This is a protected route. You can only see this because you're authenticated.</p>
        <p>User ID: {user.userId}</p>
      </div>
    </>
  );
}
