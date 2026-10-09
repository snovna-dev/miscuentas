export default function Contact() {
  return (
    <section
      id="section_5"
      className="bg-slate-100 px-4 py-20"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-bold text-slate-800 sm:text-4xl">
          !Encuentrame¡
        </h2>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          
          <div className="overflow-hidden rounded-2xl lg:col-span-1">
            <iframe
              title="Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2595.065641062665!2d-122.4230416990949!3d37.80335401520422!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80858127459fabad%3A0x808ba520e5e9edb7!2sFrancisco%20Park!5e1!3m2!1sen!2sth!4v1684340239744!5m2!1sen!2sth"
              className="h-[300px] w-full border-0"
              loading="lazy"
            />
          </div>

          <Office
            title="Contacto"
            address="Colombia"
            email="mikecode.contact@gmail.com"
          />
        </div>
      </div>
    </section>
  );
}

type OfficeProps = {
  title: string;
  address: string;
  email: string;
};

function Office({
  title,
  address,
  email,
}: OfficeProps) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h3 className="text-xl font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-4 text-slate-600">
        {address}
      </p>

      <hr className="my-6" />

      <p className="mt-3">
        <span className="font-medium">Email: </span>

        <a
          href={`mailto:${email}`}
          className="text-cyan-600 hover:underline"
        >
          {email}
        </a>
      </p>
    </div>
  );
}