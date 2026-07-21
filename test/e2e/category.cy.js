describe("Categories API", () => {
  let token;

  before(() => {
    const email = `cat_${Date.now()}@test.com`;

    cy.registerUser({ email });
    cy.loginUser({ email }).then((t) => {
      token = t;
    });
  });

  it("should create category", () => {
    cy.request({
      method: "POST",
      url: "/categories",
      headers: { Authorization: `Bearer ${token}` },
      body: { name: "Electronics" },
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.name).to.eq("Electronics");
    });
  });

  it("should fetch categories", () => {
    cy.request("/categories").then((res) => {
      expect(res.status).to.eq(200);
    });
  });
});