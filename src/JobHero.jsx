import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BriefcaseBusiness, Code2, Sparkles } from 'lucide-react'

const revealVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (reduceMotion) => ({
    opacity: 1,
    y: 0,
    transition: { duration: reduceMotion ? 0 : 0.55, ease: 'easeOut' },
  }),
}

function JobHero() {
  const shouldReduceMotion = useReducedMotion()
  const revealContainerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.14 },
    },
  }

  return (
    <section className="relative isolate overflow-hidden bg-[#08182B] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 78% 38%, rgba(18, 78, 102, 0.42), transparent 42%), linear-gradient(115deg, transparent 55%, rgba(73, 163, 166, 0.08))',
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[12%] top-20 h-44 w-44 rounded-full bg-[#00F5FF]/20 blur-[90px]"
        initial={{ opacity: 0.25, scale: 0.9 }}
        animate={shouldReduceMotion ? undefined : {
          opacity: [0.2, 0.55, 0.2],
          scale: [0.9, 1.12, 0.9],
        }}
        transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 left-[38%] h-32 w-32 rounded-full bg-[#39FF14]/10 blur-[75px]"
        initial={{ opacity: 0.18 }}
        animate={shouldReduceMotion ? undefined : { opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity, delay: 1 }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-16 pt-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:pb-20 lg:pt-24">
        <motion.div
          className="max-w-2xl"
          variants={revealContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={revealVariants}
            custom={shouldReduceMotion}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#49A3A6]/50 bg-[#124E66]/40 px-4 py-2 text-sm font-semibold tracking-wide text-[#9ADBD6]"
          >
            <Sparkles size={15} className="text-[#00F5FF]" aria-hidden="true" />
            Nền tảng tuyển dụng IT
          </motion.div>

          <motion.h1
            variants={revealVariants}
            custom={shouldReduceMotion}
            className="text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Bứt phá sự nghiệp IT
            <span className="mt-2 block bg-gradient-to-r from-[#9ADBD6] via-[#00F5FF] to-[#49A3A6] bg-clip-text text-transparent">
              bắt đầu từ StuWork.
            </span>
          </motion.h1>

          <motion.p
            variants={revealVariants}
            custom={shouldReduceMotion}
            className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg"
          >
            Khám phá cơ hội công nghệ phù hợp, kết nối với nhà tuyển dụng và đưa
            kỹ năng của bạn đến đúng nơi cần tìm.
          </motion.p>

          <motion.div
            variants={revealVariants}
            custom={shouldReduceMotion}
            className="mt-9 flex flex-col gap-4 sm:flex-row"
          >
            <motion.a
              href="#jobs"
              whileHover={shouldReduceMotion ? undefined : {
                y: -3,
                boxShadow: '0 0 30px rgba(242, 101, 34, 0.48)',
              }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F26522] px-6 py-3 font-bold text-white shadow-[0_8px_24px_rgba(242,101,34,0.22)] outline-none transition-colors hover:bg-[#ff7836] focus-visible:ring-2 focus-visible:ring-[#00F5FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08182B]"
            >
              Tìm Việc Ngay <ArrowRight size={18} aria-hidden="true" />
            </motion.a>
            <motion.button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#49A3A6]/35 bg-[#124E66]/20 px-6 py-3 font-bold text-[#9ADBD6]/60 opacity-75"
            >
              <BriefcaseBusiness size={18} aria-hidden="true" />
              Đăng Tin Tuyển Dụng
            </motion.button>
          </motion.div>
        </motion.div>

        <div className="relative mx-auto flex min-h-[300px] w-full max-w-lg items-center justify-center sm:min-h-[360px]" aria-hidden="true">
          <div className="absolute h-64 w-64 rounded-full border border-[#49A3A6]/20 sm:h-80 sm:w-80" />
          <div className="absolute h-52 w-52 rounded-full border border-dashed border-[#00F5FF]/25 sm:h-64 sm:w-64" />
          <div className="absolute h-40 w-40 rounded-full bg-[#124E66]/60 blur-2xl" />
          <div className="relative w-full max-w-sm rotate-[-3deg] rounded-2xl border border-[#49A3A6]/35 bg-[#0D243A]/90 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.42)] backdrop-blur sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-[#124E66] text-[#00F5FF]">
                  <Code2 size={22} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">Cơ hội IT mới</span>
                  <span className="mt-1 block text-xs text-slate-400">Dành cho bạn hôm nay</span>
                </span>
              </div>
              <span className="rounded-full bg-[#39FF14]/10 px-2.5 py-1 text-xs font-semibold text-[#39FF14]">Mới</span>
            </div>
            <div className="space-y-3 py-5">
              <div className="h-3 w-3/4 rounded-full bg-[#9ADBD6]/80" />
              <div className="h-2.5 w-full rounded-full bg-white/10" />
              <div className="h-2.5 w-5/6 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#49A3A6]/20 bg-[#08182B]/70 px-4 py-3">
              <span className="text-sm font-semibold text-slate-200">Frontend Developer</span>
              <ArrowRight size={17} className="text-[#00F5FF]" />
            </div>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-[#124E66]/70 px-3 py-1.5 text-xs text-[#9ADBD6]">React</span>
              <span className="rounded-full bg-[#124E66]/70 px-3 py-1.5 text-xs text-[#9ADBD6]">Remote</span>
              <span className="rounded-full bg-[#124E66]/70 px-3 py-1.5 text-xs text-[#9ADBD6]">Internship</span>
            </div>
          </div>
          <span className="absolute right-[7%] top-[12%] size-2 rounded-full bg-[#00F5FF] shadow-[0_0_16px_#00F5FF]" />
          <span className="absolute bottom-[13%] left-[8%] size-2 rounded-full bg-[#39FF14] shadow-[0_0_16px_#39FF14]" />
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-7 sm:max-w-xl sm:gap-8 lg:col-span-2">
          <div>
            <strong className="block text-2xl font-extrabold text-white sm:text-3xl">2.500<span className="text-[#00F5FF]">+</span></strong>
            <span className="mt-1 block text-xs text-slate-400 sm:text-sm">Doanh nghiệp uy tín</span>
          </div>
          <div>
            <strong className="block text-2xl font-extrabold text-white sm:text-3xl">18.000<span className="text-[#00F5FF]">+</span></strong>
            <span className="mt-1 block text-xs text-slate-400 sm:text-sm">Việc làm đang tuyển</span>
          </div>
          <div>
            <strong className="block text-2xl font-extrabold text-white sm:text-3xl">95<span className="text-[#00F5FF]">%</span></strong>
            <span className="mt-1 block text-xs text-slate-400 sm:text-sm">Ứng viên hài lòng</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default JobHero
