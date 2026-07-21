Cypress.Commands.add("registerUser", (user = {}) => {
  const defaultUser = {
    name: "Test User",
    email: `user_${Date.now()}@test.com`,
    password: "123456",
  };

  return cy.request("POST", "/auth/register", {
    ...defaultUser,
    ...user,
  });
});

Cypress.Commands.add("loginUser", (user = {}) => {
  return cy.request("POST", "/auth/login", user)
    .then((res) => res.body.token);
});