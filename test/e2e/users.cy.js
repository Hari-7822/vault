describe("Users API", () => {
  let token;

  before(() => {
    const email = `user_${Date.now()}@test.com`;

    cy.registerUser({ email });
    cy.loginUser({ email }).then((t) => {
      token = t;
    });
  });

  it("should get all users", () => {
    cy.request({
      method: "GET",
      url: "/users",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});